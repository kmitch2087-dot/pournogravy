import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, X, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";

// Manages the home hero slideshow from the Content editor. Reads/writes the same
// products.hero_slideshow / hero_order columns as the Products page, so both
// surfaces stay in sync.
interface SlideProduct {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  hero_slideshow: boolean;
  hero_order: number | null;
  flip_enabled: boolean;
}

const QKEY = ["content-slideshow-products"];

// ── Sortable card (in-slideshow) ──────────────────────────────────────────────
function SortableSlideCard({
  product, position, onRemove,
}: { product: SlideProduct; position: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}
      className="relative group border border-border bg-[#111] overflow-hidden">
      <span className="absolute top-1 left-1 z-10 text-[9px] font-mono bg-black/70 text-white/70 px-1.5 py-0.5 rounded-sm leading-none">
        {position}
      </span>
      {product.flip_enabled && (
        <span className="absolute bottom-9 right-1 z-10 text-[7px] font-display tracking-widest bg-[#fde047] text-black px-1 py-0.5 leading-none uppercase">flip</span>
      )}
      <button
        onClick={onRemove}
        title="Remove from slideshow"
        className="absolute top-1 right-1 z-10 p-0.5 bg-black/70 text-white/70 hover:text-destructive rounded-sm"
      >
        <X className="h-3 w-3" />
      </button>
      {/* drag handle = the image area */}
      <div {...attributes} {...listeners} className="aspect-square bg-[#111] cursor-grab active:cursor-grabbing">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center p-2">
            <span className="text-[9px] text-muted-foreground text-center">{product.name}</span>
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 bg-black border-t border-border/40 flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <p className="text-[10px] leading-tight line-clamp-1 text-foreground">{product.name}</p>
      </div>
    </div>
  );
}

export function HomeSlideshowManager() {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [ordered, setOrdered] = useState<SlideProduct[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery<SlideProduct[]>({
    queryKey: QKEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, image_url, hero_slideshow, hero_order, flip_enabled")
        .or("and(published.eq.true,status.eq.published),hero_slideshow.eq.true")
        .order("hero_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SlideProduct[];
    },
  });

  const inSlideshow = useMemo(
    () => products.filter((p) => p.hero_slideshow)
      .sort((a, b) => (a.hero_order ?? 1e9) - (b.hero_order ?? 1e9)),
    [products],
  );
  const available = useMemo(
    () => products.filter((p) => !p.hero_slideshow),
    [products],
  );

  // Keep the local drag list in sync with the query (unless mid-drag).
  useEffect(() => { if (!orderDirty) setOrdered(inSlideshow); }, [inSlideshow, orderDirty]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QKEY });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["public-products"] });
  };

  const add = async (p: SlideProduct) => {
    setBusyId(p.id);
    const maxOrder = Math.max(0, ...inSlideshow.map((x) => x.hero_order ?? 0));
    const { error } = await supabase.from("products")
      .update({ hero_slideshow: true, hero_order: maxOrder + 10 }).eq("id", p.id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${p.name}`);
    invalidate();
  };

  const remove = async (p: SlideProduct) => {
    setBusyId(p.id);
    const { error } = await supabase.from("products")
      .update({ hero_slideshow: false }).eq("id", p.id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${p.name}`);
    invalidate();
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = ordered.findIndex((p) => p.id === active.id);
    const newI = ordered.findIndex((p) => p.id === over.id);
    if (oldI === -1 || newI === -1) return;
    setOrdered((prev) => arrayMove(prev, oldI, newI));
    setOrderDirty(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const results = await Promise.all(
        ordered.map((p, i) => supabase.from("products").update({ hero_order: (i + 1) * 10 }).eq("id", p.id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      toast.success("Slideshow order saved");
      setOrderDirty(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="px-6 py-4 space-y-6 max-w-3xl">
      <p className="text-xs text-muted-foreground">
        Choose which products appear in the homepage hero slideshow and drag to set their order.
        These are the same controls as the Products page — changes sync both ways.
      </p>

      {/* In the slideshow */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
            In the slideshow ({ordered.length})
          </p>
          {orderDirty && (
            <button onClick={saveOrder} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-widest uppercase bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save Order
            </button>
          )}
        </div>
        {ordered.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-6 text-center border border-dashed border-border/40">
            No products in the slideshow yet — add some below.
          </p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={ordered.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ordered.map((p, i) => (
                  <SortableSlideCard key={p.id} product={p} position={i + 1} onRemove={() => remove(p)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add a product */}
      <div>
        <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase mb-2">
          Add a product
        </p>
        {available.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-4">Every published product is already in the slideshow.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {available.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                disabled={busyId === p.id}
                className="relative group border border-border bg-[#111] overflow-hidden text-left hover:border-[#fde047]/50 transition-colors disabled:opacity-50"
              >
                <div className="aspect-square bg-[#111]">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                      <span className="text-[9px] text-muted-foreground text-center">{p.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-display tracking-widest uppercase bg-[#fde047] text-black px-2 py-1">
                      {busyId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                    </span>
                  </div>
                </div>
                <div className="px-2 py-1.5 bg-black border-t border-border/40">
                  <p className="text-[10px] leading-tight line-clamp-1 text-foreground">{p.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
