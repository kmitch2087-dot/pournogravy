import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMergedProducts } from "@/lib/productSource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Loader2, Search, Pencil, Trash2, CalendarDays, GripVertical,
  ArchiveRestore, Clock, MonitorPlay,
} from "lucide-react";
import { fmtMoney, slugify } from "@/lib/admin";
import { toast } from "sonner";
import { setProductLive } from "@/lib/publishProduct";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type CategoryTab = "all" | "apparel" | "accessories" | "archived" | "slideshow";

const ARCHIVE_DAYS = 30;

interface DbProduct {
  id: string; slug: string; name: string; price_cents: number; currency: string;
  is_active: boolean; published: boolean; status: string; image_url: string | null;
  featured: boolean; category: string | null; display_order: number | null; shop_order: number | null;
  archived_at: string | null; flip_enabled: boolean; flip_image_url: string | null;
  hero_slideshow: boolean; hero_order: number | null;
}

type MergedProduct = {
  id: string | null;
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  is_active: boolean;
  published: boolean;
  image_url: string | null;
  isStatic: boolean;
  inDrop: boolean;
  category: string;
  display_order: number;
  shop_order: number | null;
  archived_at: string | null;
  flip_enabled: boolean;
  flip_image_url: string | null;
  hero_slideshow: boolean;
  hero_order: number | null;
};

// Days left before an archived product is permanently purged.
function daysLeft(archivedAt: string | null): number {
  if (!archivedAt) return ARCHIVE_DAYS;
  const elapsedMs = Date.now() - new Date(archivedAt).getTime();
  const left = ARCHIVE_DAYS - Math.floor(elapsedMs / 86_400_000);
  return Math.max(0, left);
}

// ─── Sortable grid card (reorder mode) ────────────────────────────────────────
const SortableGridCard = ({
  product, position,
}: { product: MergedProduct; position: number }) => {
  const key = product.id ?? product.slug;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group border border-border bg-[#111] overflow-hidden cursor-grab active:cursor-grabbing hover:border-[#fde047]/50 transition-colors"
    >
      {/* Position badge */}
      <span className="absolute top-1 left-1 z-10 text-[9px] font-mono bg-black/70 text-white/70 px-1.5 py-0.5 rounded-sm leading-none">
        {position}
      </span>
      {/* Flip badge */}
      {product.flip_enabled && (
        <span className="absolute top-1 right-1 z-10 text-[7px] font-display tracking-widest bg-[#fde047] text-black px-1 py-0.5 leading-none uppercase">
          flip
        </span>
      )}
      {/* Drag hint */}
      <span className="absolute bottom-[3.1rem] right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-white/50">
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      <div className="aspect-square bg-[#111]">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center p-2">
            <span className="text-[9px] text-muted-foreground text-center">{product.name}</span>
          </div>
        )}
      </div>

      <div className="px-2 py-1.5 bg-black border-t border-border/40">
        <p className="text-[10px] leading-tight line-clamp-1 text-foreground">{product.name}</p>
        <p className="text-[10px] font-display tracking-wider text-[#fde047] mt-0.5">
          {fmtMoney(product.price_cents, product.currency)}
        </p>
      </div>
    </div>
  );
};

const Products = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("all");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toPurge, setToPurge] = useState<{ id: string; name: string } | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderedList, setReorderedList] = useState<MergedProduct[]>([]);
  const [reorderField, setReorderField] = useState<"shop_order" | "hero_order">("shop_order");
  const { data: staticProducts = [] } = useMergedProducts();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: dbProducts = [], isLoading } = useQuery<DbProduct[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price_cents, currency, is_active, published, status, image_url, featured, category, display_order, shop_order, archived_at, flip_enabled, flip_image_url, hero_slideshow, hero_order")
        // Same ordering as the live shop: shop_order NULLS LAST, id.
        .order("shop_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DbProduct[];
    },
  });

  const { data: dropProductIds = [] } = useQuery<string[]>({
    queryKey: ["merch-drop-product-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merch_drop_products")
        .select("product_id");
      if (error) throw error;
      return (data ?? []).map((r: { product_id: string }) => r.product_id);
    },
  });

  const dropIdSet = useMemo(() => new Set(dropProductIds), [dropProductIds]);

  // Merge static + DB products
  const merged = useMemo((): MergedProduct[] => {
    const dbBySlug = new Map(dbProducts.map((p) => [p.slug, p]));
    const result: MergedProduct[] = [];

    for (const p of dbProducts) {
      result.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price_cents: p.price_cents,
        currency: p.currency,
        is_active: p.is_active,
        published: p.published,
        image_url: p.image_url,
        isStatic: false,
        inDrop: dropIdSet.has(p.id),
        category: p.category ?? "apparel",
        display_order: p.display_order ?? 0,
        shop_order: p.shop_order ?? null,
        archived_at: p.archived_at ?? null,
        flip_enabled: p.flip_enabled ?? false,
        flip_image_url: p.flip_image_url ?? null,
        hero_slideshow: p.hero_slideshow ?? false,
        hero_order: p.hero_order ?? null,
      });
    }

    for (const sp of staticProducts) {
      if (!dbBySlug.has(sp.id)) {
        result.push({
          id: null,
          slug: sp.id,
          name: sp.name,
          price_cents: Math.round(sp.price * 100),
          currency: "USD",
          is_active: sp.published === true,
          published: sp.published === true,
          image_url: sp.image ?? sp.images?.[0] ?? null,
          isStatic: true,
          inDrop: false,
          category: "apparel",
          display_order: 0,
          shop_order: null,
          archived_at: null,
          flip_enabled: false,
          flip_image_url: null,
          hero_slideshow: false,
          hero_order: null,
        });
      }
    }

    return result;
  }, [dbProducts, dropIdSet, staticProducts]);

  // Active (non-archived) products for the normal tabs.
  const activeProducts = useMemo(() => merged.filter((p) => !p.archived_at), [merged]);

  // Archived within the retention window, newest first.
  const archivedProducts = useMemo(
    () =>
      merged
        .filter((p) => p.archived_at && daysLeft(p.archived_at) > 0)
        .sort((a, b) => (b.archived_at! < a.archived_at! ? -1 : 1)),
    [merged],
  );

  const viewArchived = categoryTab === "archived";
  const viewSlideshow = categoryTab === "slideshow";

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result: MergedProduct[];
    if (viewArchived) {
      result = archivedProducts;
    } else if (viewSlideshow) {
      // Slideshow members, in dedicated hero_order.
      result = activeProducts
        .filter((p) => p.hero_slideshow)
        .sort((a, b) =>
          (a.hero_order ?? Number.MAX_SAFE_INTEGER) - (b.hero_order ?? Number.MAX_SAFE_INTEGER) ||
          (a.shop_order ?? Number.MAX_SAFE_INTEGER) - (b.shop_order ?? Number.MAX_SAFE_INTEGER));
    } else {
      result = activeProducts;
      if (categoryTab !== "all") result = result.filter((p) => p.category === categoryTab);
    }
    if (!q) return result;
    return result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [activeProducts, archivedProducts, viewArchived, viewSlideshow, search, categoryTab]);

  const handleToggleLive = async (p: MergedProduct, newVal: boolean) => {
    const key = p.id ?? p.slug;
    setToggling(key);
    try {
      if (p.id) {
        const { error } = await setProductLive(supabase, p.id, newVal);
        if (error) throw error;
      } else {
        const staticProd = staticProducts.find((s) => s.id === p.slug);
        if (!staticProd) throw new Error("Static product not found");
        const { error } = await supabase.from("products").insert({
          slug: staticProd.id,
          name: staticProd.name,
          description: staticProd.description ?? null,
          humor: staticProd.humor ?? null,
          price_cents: Math.round(staticProd.price * 100),
          is_active: newVal,
          published: newVal,
          status: newVal ? "published" : "draft",
          featured: staticProd.featured ?? false,
          fit_type: staticProd.variants ? "mens_womens" : "unisex",
          sizes: staticProd.sizes ?? [],
          images: staticProd.images ?? [],
          image_url: staticProd.image ?? staticProd.images?.[0] ?? null,
          badge: staticProd.badge ?? null,
          ...(newVal ? { went_live_at: new Date().toISOString() } : {}),
        });
        if (error) throw error;
      }
      toast.success(newVal ? "Product is now LIVE" : "Product set to draft");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setToggling(null);
    }
  };

  // "Delete" = soft delete → moves to Archived for 30 days. FK-safe: the row
  // stays, so orders that reference it are untouched.
  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase
      .from("products")
      .update({ archived_at: new Date().toISOString(), is_active: false, published: false })
      .eq("id", toDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${toDelete.name} moved to Archived — ${ARCHIVE_DAYS} days to restore`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    }
    setToDelete(null);
  };

  const handleRestore = async (p: MergedProduct) => {
    if (!p.id) return;
    const { error } = await supabase.from("products").update({ archived_at: null }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${p.name} restored — as a draft`);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  // Quick add/remove from the home slideshow, straight from the list.
  const handleToggleSlideshow = async (p: MergedProduct) => {
    if (!p.id) { toast.error("Publish this product first, then add it to the slideshow."); return; }
    const { error } = await supabase
      .from("products").update({ hero_slideshow: !p.hero_slideshow }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(p.hero_slideshow ? "Removed from slideshow" : "Added to slideshow");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  // Permanent delete. Fails (gracefully) if the product has order history.
  const handlePurge = async () => {
    if (!toPurge) return;
    const { error } = await supabase.from("products").delete().eq("id", toPurge.id);
    if (error) {
      toast.error("Can't delete permanently — it has order history. It stays archived and hidden.");
    } else {
      toast.success(`${toPurge.name} permanently deleted`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    }
    setToPurge(null);
  };

  const handleEdit = (p: MergedProduct) => {
    if (p.id) navigate(`/admin/products/${p.id}`);
    else navigate(`/admin/products/new?from=${p.slug}`);
  };

  const handleEnterReorder = () => {
    setReorderedList([...filtered]);
    // Slideshow tab reorders hero_order; every other tab reorders shop_order.
    setReorderField(viewSlideshow ? "hero_order" : "shop_order");
    setReorderMode(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = reorderedList.findIndex((p) => (p.id ?? p.slug) === active.id);
    const newIndex = reorderedList.findIndex((p) => (p.id ?? p.slug) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setReorderedList((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleSaveOrder = async () => {
    const dbOnly = reorderedList.filter((p) => p.id !== null);
    if (dbOnly.length === 0) return;
    setReordering(true);
    try {
      const results = await Promise.all(
        dbOnly.map((p, i) =>
          supabase.from("products").update({ [reorderField]: (i + 1) * 10 }).eq("id", p.id!)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      toast.success("Order saved!");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setReorderMode(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setReordering(false);
    }
  };

  const tabCounts = useMemo(() => ({
    all: activeProducts.length,
    apparel: activeProducts.filter((p) => p.category === "apparel").length,
    accessories: activeProducts.filter((p) => p.category === "accessories").length,
    archived: archivedProducts.length,
    slideshow: activeProducts.filter((p) => p.hero_slideshow).length,
  }), [activeProducts, archivedProducts]);

  const getLiveState = (p: MergedProduct): "live" | "listed" | "draft" => {
    if (!p.published) return "draft";
    return "listed";
  };

  return (
    <div className="space-y-6">
      {/* Search + actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            aria-label="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            disabled={reorderMode}
          />
        </div>
        <div className="flex gap-2">
          {reorderMode ? (
            <>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setReorderMode(false)} disabled={reordering}>
                Cancel
              </Button>
              <Button size="sm" className="bg-[#fde047] text-black hover:bg-[#fde047]/90 text-xs font-display tracking-widest" onClick={handleSaveOrder} disabled={reordering}>
                {reordering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "SAVE ORDER"}
              </Button>
            </>
          ) : (
            <>
              {!viewArchived && (
                <Button variant="outline" size="sm" className="text-xs" onClick={handleEnterReorder}>
                  <GripVertical className="h-3.5 w-3.5 mr-1" /> Reorder
                </Button>
              )}
              <Button asChild className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest">
                <Link to="/admin/products/new"><Plus className="h-4 w-4 mr-1.5" /> NEW PRODUCT</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Category sub-tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["all", "apparel", "accessories"] as CategoryTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setCategoryTab(tab); setReorderMode(false); }}
            disabled={reorderMode}
            className={[
              "px-4 py-2 text-xs font-display tracking-widest uppercase border-b-2 -mb-px transition disabled:opacity-40",
              categoryTab === tab
                ? "border-[#fde047] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab} <span className="ml-1 text-muted-foreground font-sans normal-case tracking-normal">({tabCounts[tab]})</span>
          </button>
        ))}
        {/* Slideshow + Archived — right-aligned */}
        <button
          onClick={() => { setCategoryTab("slideshow"); setReorderMode(false); }}
          disabled={reorderMode}
          className={[
            "ml-auto px-4 py-2 text-xs font-display tracking-widest uppercase border-b-2 -mb-px transition disabled:opacity-40 flex items-center gap-1.5",
            viewSlideshow
              ? "border-[#fde047] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <MonitorPlay className="h-3.5 w-3.5" /> Slideshow
          <span className="text-muted-foreground font-sans normal-case tracking-normal">({tabCounts.slideshow})</span>
        </button>
        <button
          onClick={() => { setCategoryTab("archived"); setReorderMode(false); }}
          disabled={reorderMode}
          className={[
            "px-4 py-2 text-xs font-display tracking-widest uppercase border-b-2 -mb-px transition disabled:opacity-40 flex items-center gap-1.5",
            viewArchived
              ? "border-[#fde047] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <Clock className="h-3.5 w-3.5" /> Archived
          <span className="text-muted-foreground font-sans normal-case tracking-normal">({tabCounts.archived})</span>
        </button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {viewArchived
              ? "Nothing in the archive."
              : search ? "Nothing matches that." : "No products found."}
          </div>
        ) : viewArchived ? (
          /* ── Archived grid — countdown + restore / delete-forever ── */
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => {
              const left = daysLeft(p.archived_at);
              return (
                <div key={p.id ?? p.slug} className="relative border border-border bg-[#111] overflow-hidden flex flex-col">
                  <span className="absolute top-1 left-1 z-10 flex items-center gap-1 text-[9px] font-mono bg-black/75 text-amber-300 px-1.5 py-0.5 rounded-sm leading-none">
                    <Clock className="h-2.5 w-2.5" /> {left}d left
                  </span>
                  <div className="aspect-square bg-[#111] opacity-60">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                        <span className="text-[9px] text-muted-foreground text-center">{p.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5 bg-black border-t border-border/40 flex-1">
                    <p className="text-[10px] leading-tight line-clamp-2 text-foreground">{p.name}</p>
                  </div>
                  <div className="flex border-t border-border/40">
                    <button
                      onClick={() => handleRestore(p)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-display tracking-widest uppercase text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                      <ArchiveRestore className="h-3 w-3" /> Restore
                    </button>
                    <button
                      onClick={() => setToPurge({ id: p.id!, name: p.name })}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 border-l border-border/40 transition-colors"
                      title="Delete permanently now"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : reorderMode ? (
          /* ── Reorder — square-card grid, drag to slide ── */
          <div className="p-4">
            <p className="text-[10px] text-muted-foreground/60 mb-3">
              Drag any card to reposition — others slide out of the way.{" "}
              {reorderField === "hero_order"
                ? "This sets the home slideshow order."
                : "This is exactly how the shop grid reads."}
              <span className="ml-1">Yellow <span className="text-[#fde047]">flip</span> badge = card animation.</span>
            </p>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={reorderedList.map((p) => p.id ?? p.slug)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {reorderedList.map((p, i) => (
                    <SortableGridCard key={p.id ?? p.slug} product={p} position={i + 1} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          /* ── Normal list ── */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Product</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center w-32">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const key = p.id ?? p.slug;
                const isToggling = toggling === key;
                return (
                  <TableRow key={key}>
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 object-cover rounded-sm border border-border" />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded-sm" />
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleEdit(p)}
                        className="font-medium hover:text-[#fde047] transition text-left"
                      >
                        {p.name}
                        {p.inDrop && (
                          <CalendarDays className="inline h-3.5 w-3.5 ml-1.5 text-[#fde047] -mt-0.5" />
                        )}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{p.slug}</span>
                        {p.isStatic && (
                          <Badge className="text-[9px] px-1 py-0 bg-muted text-muted-foreground border-border">CATALOG</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase tracking-widest">
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-display tracking-wider">
                      {fmtMoney(p.price_cents, p.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                      ) : (() => {
                        const state = getLiveState(p);
                        if (state === "live") return (
                          <Badge onClick={() => handleToggleLive(p, false)} className="cursor-pointer bg-green-500/20 text-green-400 border-green-500/30 text-[9px] px-2 py-0.5 hover:bg-green-500/30 transition">LIVE</Badge>
                        );
                        if (state === "listed") return (
                          <Badge onClick={() => handleToggleLive(p, false)} title="Visible in shop but cannot be purchased — set a Stripe Price ID first." className="cursor-pointer bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-2 py-0.5 hover:bg-amber-500/30 transition">LISTED</Badge>
                        );
                        return (
                          <Badge onClick={() => handleToggleLive(p, true)} className="cursor-pointer bg-muted text-muted-foreground border-border text-[9px] px-2 py-0.5 hover:bg-muted/70 transition">DRAFT</Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {p.id && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleToggleSlideshow(p)}
                            title={p.hero_slideshow ? "In home slideshow — click to remove" : "Add to home slideshow"}
                          >
                            <MonitorPlay className={`h-4 w-4 ${p.hero_slideshow ? "text-[#fde047]" : "text-muted-foreground/40"}`} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.id && (
                          <Button variant="ghost" size="icon" onClick={() => setToDelete({ id: p.id!, name: p.name })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete → archive confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Archived?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.name}</strong> will be hidden from the shop and moved to
              <strong> Archived</strong> for {ARCHIVE_DAYS} days. You can restore it anytime before then;
              after that it's permanently removed. Existing orders are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest">
              Move to Archived
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete-forever confirm */}
      <AlertDialog open={!!toPurge} onOpenChange={(o) => !o && setToPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{toPurge?.name}</strong> right now — no undo. (If it has
              past orders it can't be fully deleted and will simply stay hidden.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurge} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
