import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as staticProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, X, Plus, ExternalLink, Eye, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/admin";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { cn } from "@/lib/utils";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

interface ColorRow {
  name: string;
  hex: string;
}

interface FormState {
  slug: string;
  slugOverride: boolean;   // true once user has manually edited the slug
  name: string;
  category: string;
  description: string;
  humor: string;
  longDescription: string;  // textarea — newline-separated paragraphs
  badAdviceTitle: string;
  badAdviceParagraphs: string; // textarea — newline-separated paragraphs
  price_dollars: string;
  badge: string;
  isLive: boolean;
  featured: boolean;
  wentLiveAt: string;        // datetime-local value
  // Images
  mainImageUrl: string;
  backImageUrl: string;
  additionalImages: string[];
  focusX: number;
  focusY: number;
  // Variants
  sizes: string[];
  colors: ColorRow[];
  // Fulfillment
  fulfillment_type: string;
  // Copy section order
  sectionOrder: string[];
  // Section visibility toggles
  sectionVisibility: Record<string, boolean>;
}

const DEFAULT_SECTION_ORDER = ["humor", "description", "longDescription", "badAdvice"];

const defaultForm = (): FormState => ({
  slug: "",
  slugOverride: false,
  name: "",
  category: "apparel",
  description: "",
  humor: "",
  longDescription: "",
  badAdviceTitle: "",
  badAdviceParagraphs: "",
  price_dollars: "",
  badge: "",
  isLive: false,
  featured: false,
  wentLiveAt: "",
  mainImageUrl: "",
  backImageUrl: "",
  additionalImages: [],
  focusX: 40,
  focusY: 50,
  sizes: ["XS", "S", "M", "L", "XL", "2XL"],
  colors: [],
  fulfillment_type: "printer",
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  sectionVisibility: { humor: true, description: true, longDescription: true, badAdvice: true },
});

// ─── Paragraph list (keeps existing ParagraphList helper) ───────────────────
const ParagraphList = ({
  label, paragraphs, onChange, placeholder, rows = 3,
}: {
  label: string; paragraphs: string[]; onChange: (p: string[]) => void;
  placeholder?: string; rows?: number;
}) => {
  const update = (i: number, v: string) => {
    const next = [...paragraphs]; next[i] = v; onChange(next);
  };
  const remove = (i: number) => onChange(paragraphs.filter((_, idx) => idx !== i));
  const add = () => onChange([...paragraphs, ""]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={add} className="text-xs text-[#fde047] h-6 px-2">
          <Plus className="h-3 w-3 mr-1" /> Add paragraph
        </Button>
      </div>
      {paragraphs.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No paragraphs yet.</p>
      )}
      {paragraphs.map((para, i) => (
        <div key={i} className="relative group">
          <Textarea
            value={para}
            onChange={(e) => update(i, e.target.value)}
            rows={rows}
            placeholder={placeholder ?? `Paragraph ${i + 1}`}
            className="pr-8 resize-none"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Draggable copy section wrapper ─────────────────────────────────────────
const DraggableSection = ({
  id, label, children, onDragStart, onDragOver, onDrop,
  visible = true, onToggleVisible,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (id: string) => void;
  visible?: boolean;
  onToggleVisible?: (id: string, val: boolean) => void;
}) => (
  <div
    draggable
    onDragStart={() => onDragStart(id)}
    onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
    onDrop={() => onDrop(id)}
    className={cn(
      "border border-border rounded-md p-4 space-y-3 bg-background/50 transition-opacity",
      !visible && "opacity-50"
    )}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-3">
        {onToggleVisible && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              {visible ? 'Published' : 'Hidden'}
            </span>
            <button
              type="button"
              onClick={() => onToggleVisible(id, !visible)}
              className={cn(
                'relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out',
                visible ? 'bg-[#cddc39]' : 'bg-muted'
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-lg',
                'transform transition duration-200 ease-in-out',
                visible ? 'translate-x-4' : 'translate-x-0'
              )} />
            </button>
          </div>
        )}
        <div
          className="text-muted-foreground hover:text-[#fde047] transition-colors"
          style={{ cursor: "grab" }}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </div>
    </div>
    {children}
  </div>
);

// ─── Shirt outline SVG for print preview ────────────────────────────────────
const ShirtOutline = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 200 240"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full h-full ${className}`}
  >
    <path
      d="M68 5 C82 5 88 26 100 26 C112 26 118 5 132 5 L200 48 L178 92 L156 82 L156 234 L44 234 L44 82 L22 92 L0 48 Z"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Print preview ────────────────────────────────────────────────────────────
const PrintPreview = ({ slug }: { slug: string }) => {
  const [blackError, setBlackError] = useState(false);
  const [whiteError, setWhiteError] = useState(false);

  const blackUrl = supabase.storage.from("print-files").getPublicUrl(`black/${slug}.png`).data.publicUrl;
  const whiteUrl = supabase.storage.from("print-files").getPublicUrl(`white/${slug}.png`).data.publicUrl;

  if (blackError && whiteError) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display tracking-widest text-sm">PRINT PREVIEW</CardTitle>
        <p className="text-xs text-muted-foreground font-mono">{slug}.png</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {!whiteError && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Dark / White print</p>
              <div className="relative bg-zinc-900 rounded overflow-hidden" style={{ aspectRatio: "5/6" }}>
                <div className="absolute inset-0 p-4 text-zinc-700">
                  <ShirtOutline />
                </div>
                <img
                  src={whiteUrl}
                  alt="White print overlay"
                  onError={() => setWhiteError(true)}
                  className="absolute pointer-events-none object-contain"
                  style={{ top: "38%", left: "50%", transform: "translateX(-50%)", width: "42%" }}
                />
              </div>
            </div>
          )}
          {!blackError && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Light / Black print</p>
              <div className="relative bg-zinc-100 rounded overflow-hidden" style={{ aspectRatio: "5/6" }}>
                <div className="absolute inset-0 p-4 text-zinc-400">
                  <ShirtOutline />
                </div>
                <img
                  src={blackUrl}
                  alt="Black print overlay"
                  onError={() => setBlackError(true)}
                  className="absolute pointer-events-none object-contain"
                  style={{ top: "38%", left: "50%", transform: "translateX(-50%)", width: "42%" }}
                />
              </div>
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 italic">
          Preview hides automatically if print file is not yet uploaded.
        </p>
      </CardContent>
    </Card>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
const ProductEdit = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromSlug = searchParams.get("from");
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mainUploading, setMainUploading] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [initialized, setInitialized] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainUploadRef = useRef<HTMLInputElement>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("products").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // ── Populate form ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialized) return;

    if (!isNew && product) {
      const ba = product.bad_advice as { title?: string; paragraphs?: string[] } | null;
      const allImages: string[] = (() => {
        if (product.images?.length) return product.images as string[];
        if ((product as Record<string, unknown>).image_url)
          return [(product as Record<string, unknown>).image_url as string];
        const sp = staticProducts.find((s) => s.id === product.slug);
        return sp?.images?.length ? sp.images : (sp?.image ? [sp.image] : []);
      })();

      const [main = "", ...rest] = allImages;
      const rawColors = (product.colors as ColorRow[] | null) ?? [];

      const wentLiveAtRaw = (product as Record<string, unknown>).went_live_at as string | null;
      const wentLiveAtLocal = wentLiveAtRaw
        ? new Date(wentLiveAtRaw).toISOString().slice(0, 16)
        : "";

      setForm({
        slug: product.slug ?? "",
        slugOverride: true,
        name: product.name ?? "",
        category: (product as Record<string, unknown>).category as string ?? "apparel",
        description: product.description ?? "",
        humor: product.humor ?? "",
        longDescription: ((product.long_description as string[] | null) ?? []).join("\n"),
        badAdviceTitle: ba?.title ?? "",
        badAdviceParagraphs: (ba?.paragraphs ?? []).join("\n"),
        price_dollars: product.price_cents ? (product.price_cents / 100).toFixed(2) : "",
        badge: (product as Record<string, unknown>).badge as string ?? "",
        isLive: !!(product.is_active && product.published),
        featured: !!(product as Record<string, unknown>).featured,
        wentLiveAt: wentLiveAtLocal,
        mainImageUrl: main,
        backImageUrl: (product as Record<string, unknown>).back_image_url as string ?? "",
        additionalImages: rest,
        focusX: (product as Record<string, unknown>).focus_x as number
          ?? (product as Record<string, unknown>).thumbnail_focal_x as number
          ?? 40,
        focusY: (product as Record<string, unknown>).focus_y as number
          ?? (product as Record<string, unknown>).thumbnail_focal_y as number
          ?? 50,
        sizes: (product.sizes as string[] | null)?.length
          ? (product.sizes as string[])
          : ["XS", "S", "M", "L", "XL", "2XL"],
        colors: rawColors,
        fulfillment_type: (product as Record<string, unknown>).fulfillment_type as string
          ?? mapLegacyRoute((product as Record<string, unknown>).fulfillment_route as string | undefined),
        sectionOrder: ((product as Record<string, unknown>).section_order as string[] | null)?.length
          ? (product as Record<string, unknown>).section_order as string[]
          : [...DEFAULT_SECTION_ORDER],
        sectionVisibility: ((product as Record<string, unknown>).section_visibility as Record<string, boolean> | null) ?? {
          humor: true, description: true, longDescription: true, badAdvice: true,
        },
      });
      setInitialized(true);
    } else if (isNew && fromSlug) {
      const sp = staticProducts.find((p) => p.id === fromSlug);
      if (sp) {
        const allImages = sp.images?.length ? sp.images : (sp.image ? [sp.image] : []);
        const [main = "", ...rest] = allImages;
        setForm({
          slug: sp.id,
          slugOverride: true,
          name: sp.name,
          category: "apparel",
          description: sp.description ?? "",
          humor: sp.humor ?? "",
          longDescription: (sp.longDescription ?? []).join("\n"),
          badAdviceTitle: sp.badAdvice?.title ?? "",
          badAdviceParagraphs: (sp.badAdvice?.paragraphs ?? []).join("\n"),
          price_dollars: sp.price.toFixed(2),
          badge: sp.badge ?? "",
          isLive: sp.published === true,
          featured: sp.featured === true,
          wentLiveAt: "",
          mainImageUrl: main,
          backImageUrl: "",
          additionalImages: rest,
          focusX: 40,
          focusY: 50,
          sizes: sp.sizes ?? ["XS", "S", "M", "L", "XL", "2XL"],
          colors: [],
          fulfillment_type: "printer",
          sectionVisibility: { humor: true, description: true, longDescription: true, badAdvice: true },
        });
        setInitialized(true);
      }
    } else if (isNew && !fromSlug) {
      setInitialized(true);
    }
  }, [product, isNew, fromSlug, initialized]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setF = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // ── Drag-and-drop for copy sections ────────────────────────────────────────
  const dragItem = useRef<string | null>(null);
  const handleDragStart = (id: string) => { dragItem.current = id; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (targetId: string) => {
    if (!dragItem.current || dragItem.current === targetId) return;
    const order = [...form.sectionOrder];
    const from = order.indexOf(dragItem.current);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, dragItem.current);
    setF({ sectionOrder: order });
    dragItem.current = null;
  };

  const toggleSectionVisibility = (sectionId: string, val: boolean) => {
    setF({ sectionVisibility: { ...form.sectionVisibility, [sectionId]: val } });
  };

  const handleNameChange = (name: string) => {
    setF(form.slugOverride ? { name } : { name, slug: slugify(name) });
  };

  const handleSlugChange = (raw: string) => {
    setF({ slug: slugify(raw), slugOverride: raw !== "" });
  };

  // Image upload to Supabase Storage
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const basePath = form.slug || crypto.randomUUID();
    const path = `${basePath}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("products")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    // Place as main image if none set, otherwise add to additional images
    if (!form.mainImageUrl) {
      setF({ mainImageUrl: data.publicUrl });
    } else {
      setF({ additionalImages: [...form.additionalImages, data.publicUrl] });
    }
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleMainImageUpload = async (file: File) => {
    setMainUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const basePath = form.slug || crypto.randomUUID();
    const path = `${basePath}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("products")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) { toast.error(error.message); setMainUploading(false); return; }
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setF({ mainImageUrl: data.publicUrl });
    setMainUploading(false);
    toast.success("Main image uploaded");
  };

  // Color row helpers
  const addColor = () => setF({ colors: [...form.colors, { name: "", hex: "#000000" }] });
  const updateColor = (i: number, patch: Partial<ColorRow>) => {
    const next = [...form.colors];
    next[i] = { ...next[i], ...patch };
    setF({ colors: next });
  };
  const removeColor = (i: number) =>
    setF({ colors: form.colors.filter((_, idx) => idx !== i) });

  // Size checkbox toggle
  const toggleSize = (size: string) => {
    const next = form.sizes.includes(size)
      ? form.sizes.filter((s) => s !== size)
      : [...form.sizes, size];
    setF({ sizes: next });
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name) return toast.error("Name is required");
    if (!form.price_dollars || isNaN(Number(form.price_dollars)))
      return toast.error("Valid price is required");

    setSaving(true);
    const slug = form.slug || slugify(form.name);

    // Compile images array: main first, then additional (skip back_image — stored separately)
    const images = [
      form.mainImageUrl,
      ...form.additionalImages,
    ].filter(Boolean);

    // Parse text fields — longDescription and badAdvice are now HTML strings from RichTextEditor
    const longDescHtml = form.longDescription?.trim();
    const longDesc = longDescHtml ? [longDescHtml] : [];
    const badParagraphsHtml = form.badAdviceParagraphs?.trim();
    const badAdvice = form.badAdviceTitle || badParagraphsHtml
      ? { title: form.badAdviceTitle, paragraphs: badParagraphsHtml ? [badParagraphsHtml] : [] }
      : null;

    // wentLiveAt: respect what's in the field; if going live and field is empty, stamp now
    let wentLiveAt: string | null = form.wentLiveAt
      ? new Date(form.wentLiveAt).toISOString()
      : null;

    const payload: Record<string, unknown> = {
      slug,
      name: form.name,
      category: form.category,
      description: form.description || null,
      humor: form.humor || null,
      long_description: longDesc.length > 0 ? longDesc : null,
      bad_advice: badAdvice,
      section_order: form.sectionOrder,
      section_visibility: form.sectionVisibility ?? {
        humor: true, description: true, longDescription: true, badAdvice: true,
      },
      price_cents: Math.round(Number(form.price_dollars) * 100),
      is_active: form.isLive,
      published: form.isLive,
      status: form.isLive ? "published" : "draft",
      featured: form.featured,
      badge: form.badge || null,
      images: images.length > 0 ? images : [],
      image_url: images[0] ?? null,
      back_image_url: form.backImageUrl || null,
      focus_x: form.focusX,
      focus_y: form.focusY,
      // Also write to the legacy focal columns so existing display code keeps working
      thumbnail_focal_x: form.focusX,
      thumbnail_focal_y: form.focusY,
      sizes: form.sizes?.length > 0 ? form.sizes : [],
      colors: form.colors?.length > 0 ? form.colors : [],
      fulfillment_type: form.fulfillment_type,
      // Keep fulfillment_route in sync with the legacy column
      fulfillment_route: mapFulfillmentTypeToRoute(form.fulfillment_type),
    };

    let error;
    if (!isNew) {
      // Stamp went_live_at on first publish if not already set
      if (form.isLive && !wentLiveAt) {
        const { data: existing } = await supabase
          .from("products")
          .select("went_live_at")
          .eq("id", id!)
          .maybeSingle();
        if (!existing?.went_live_at) {
          wentLiveAt = new Date().toISOString();
        }
      }
      payload.went_live_at = wentLiveAt;
      ({ error } = await supabase.from("products").update(payload).eq("id", id!));
    } else {
      if (form.isLive && !wentLiveAt) {
        wentLiveAt = new Date().toISOString();
      }
      payload.went_live_at = wentLiveAt;
      ({ error } = await supabase.from("products").insert([payload]));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const now = new Date();
    setLastSaved(now);
    toast.success(isNew ? "Product created" : "Saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    if (isNew) navigate("/admin/products");
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  const openPreview = () => {
    const slug = form.slug || slugify(form.name);
    if (!slug) return toast.error("Add a name or slug first");

    const longDescHtml = form.longDescription?.trim();
    const longDesc = longDescHtml ? [longDescHtml] : [];
    const badParagraphsHtml = form.badAdviceParagraphs?.trim();
    const images = [form.mainImageUrl, ...form.additionalImages].filter(Boolean);

    const previewProduct = {
      id: slug,
      name: form.name,
      price: Number(form.price_dollars) || 0,
      description: form.description,
      humor: form.humor,
      longDescription: longDesc,
      badAdvice: (form.badAdviceTitle || badParagraphsHtml)
        ? { title: form.badAdviceTitle, paragraphs: badParagraphsHtml ? [badParagraphsHtml] : [] }
        : undefined,
      badge: form.badge || undefined,
      published: true,
      featured: form.featured,
      images,
      image: images[0],
      sizes: form.sizes,
      colors: form.colors.length > 0
        ? form.colors.map((c) => ({ id: c.name.toLowerCase(), label: c.name, hex: c.hex }))
        : [{ id: "black", label: "Black", hex: "#0a0a0a" }, { id: "white", label: "White", hex: "#ffffff" }],
      variants: [{ id: "unisex", label: "Unisex", images }],
    };

    sessionStorage.setItem(`preview_product_${slug}`, JSON.stringify(previewProduct));
    window.open(`/product/${slug}?preview=1`, "_blank", "noopener");
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPOD = form.fulfillment_type === "printful" || form.fulfillment_type === "printify";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to products
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-display tracking-widest"
            onClick={openPreview}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
          </Button>
          {form.slug && form.isLive && (
            <a href={`/product/${form.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs font-display tracking-widest">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View on Site
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column — content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── CORE INFO ── */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">CORE INFO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Product name"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={form.name ? slugify(form.name) : "auto-generated-from-name"}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from name. Edit to override.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setF({ category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apparel">Apparel</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Price (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price_dollars}
                    onChange={(e) => setF({ price_dollars: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Badge Text</Label>
                  <Input
                    value={form.badge}
                    onChange={(e) => setF({ badge: e.target.value })}
                    placeholder="e.g. NEW, BESTSELLER"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Went Live At</Label>
                <Input
                  type="datetime-local"
                  value={form.wentLiveAt}
                  onChange={(e) => setF({ wentLiveAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-stamped on first publish. Controls the "NEW" badge 14-day window.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── COPY (drag-and-drop reorderable) ── */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">COPY</CardTitle>
              <p className="text-xs text-muted-foreground">Drag sections to reorder. Keep it in Opie's voice — raw and honest.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.sectionOrder.map((sectionId) => {
                if (sectionId === "humor") return (
                  <DraggableSection key="humor" id="humor" label="Humor / Zinger"
                    onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                    visible={form.sectionVisibility?.humor ?? true}
                    onToggleVisible={toggleSectionVisibility}>
                    <Input
                      value={form.humor}
                      onChange={(e) => setF({ humor: e.target.value })}
                      placeholder="One-liner shown as the yellow italic subheading on the product page"
                    />
                  </DraggableSection>
                );
                if (sectionId === "description") return (
                  <DraggableSection key="description" id="description" label="Short Description"
                    onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                    visible={form.sectionVisibility?.description ?? true}
                    onToggleVisible={toggleSectionVisibility}>
                    <RichTextEditor
                      value={form.description}
                      onChange={(html) => setF({ description: html })}
                      placeholder="The main product copy shown on the product page."
                      minHeight="100px"
                    />
                  </DraggableSection>
                );
                if (sectionId === "longDescription") return (
                  <DraggableSection key="longDescription" id="longDescription" label="Long Description"
                    onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                    visible={form.sectionVisibility?.longDescription ?? true}
                    onToggleVisible={toggleSectionVisibility}>
                    <RichTextEditor
                      value={form.longDescription ?? ''}
                      onChange={(html) => setF({ longDescription: html })}
                      placeholder="Extended copy shown in the expandable section."
                      minHeight="160px"
                    />
                  </DraggableSection>
                );
                if (sectionId === "badAdvice") return (
                  <DraggableSection key="badAdvice" id="badAdvice" label="Bad Bartender Advice"
                    onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                    visible={form.sectionVisibility?.badAdvice ?? true}
                    onToggleVisible={toggleSectionVisibility}>
                    <div className="space-y-3">
                      <Input
                        value={form.badAdviceTitle}
                        onChange={(e) => setF({ badAdviceTitle: e.target.value })}
                        placeholder="e.g. Bad Bartender Advice"
                      />
                      <RichTextEditor
                        value={form.badAdviceParagraphs ?? ''}
                        onChange={(html) => setF({ badAdviceParagraphs: html })}
                        placeholder="Shown in the Bad Advice section."
                        minHeight="120px"
                      />
                    </div>
                  </DraggableSection>
                );
                return null;
              })}
            </CardContent>
          </Card>

          {/* ── IMAGES ── */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">IMAGES</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main image */}
              <div className="space-y-1.5">
                <Label>Main Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.mainImageUrl}
                    onChange={(e) => setF({ mainImageUrl: e.target.value })}
                    placeholder="https://…"
                  />
                  {form.mainImageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setF({ mainImageUrl: "" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {form.mainImageUrl && (
                  <img
                    src={form.mainImageUrl}
                    alt="Main"
                    className="mt-2 h-24 w-24 object-cover rounded-sm border border-border"
                  />
                )}
              </div>

              {/* Back image */}
              <div className="space-y-1.5">
                <Label>Back / Logo Side Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.backImageUrl}
                    onChange={(e) => setF({ backImageUrl: e.target.value })}
                    placeholder="https://… (optional)"
                  />
                  {form.backImageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setF({ backImageUrl: "" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {form.backImageUrl && (
                  <img
                    src={form.backImageUrl}
                    alt="Back"
                    className="mt-2 h-24 w-24 object-cover rounded-sm border border-border"
                  />
                )}
              </div>

              {/* Additional images */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Additional Images</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setF({ additionalImages: [...form.additionalImages, ""] })}
                    className="text-xs text-[#fde047] h-6 px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add URL
                  </Button>
                </div>
                {form.additionalImages.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No additional images.</p>
                )}
                {form.additionalImages.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={url}
                      onChange={(e) => {
                        const next = [...form.additionalImages];
                        next[i] = e.target.value;
                        setF({ additionalImages: next });
                      }}
                      placeholder="https://…"
                    />
                    {url && (
                      <img
                        src={url}
                        alt=""
                        className="h-9 w-9 object-cover rounded-sm border border-border flex-shrink-0"
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setF({ additionalImages: form.additionalImages.filter((_, idx) => idx !== i) })
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Upload button */}
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-[#fde047] transition border border-dashed border-border rounded px-3 py-2">
                  {uploading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />}
                  Upload from disk
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Uploads to Supabase Storage. If no main image is set, the upload fills that slot first.
                </p>
              </div>

              {/* Focal point */}
              <div className="space-y-3 border-t border-border pt-4">
                <Label className="text-xs tracking-wider uppercase">Image Focus Point</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Focus X %</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={form.focusX}
                        onChange={(e) => setF({ focusX: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-8 text-right">{form.focusX}%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Focus Y %</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={form.focusY}
                        onChange={(e) => setF({ focusY: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-8 text-right">{form.focusY}%</span>
                    </div>
                  </div>
                </div>
                {form.mainImageUrl && (
                  <div
                    className="relative aspect-square overflow-hidden border border-border cursor-crosshair max-w-[180px]"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setF({
                        focusX: Math.round(((e.clientX - rect.left) / rect.width) * 100),
                        focusY: Math.round(((e.clientY - rect.top) / rect.height) * 100),
                      });
                    }}
                  >
                    <img
                      src={form.mainImageUrl}
                      alt=""
                      className="w-full h-full object-cover scale-[1.35] pointer-events-none"
                      style={{ transformOrigin: `${form.focusX}% ${form.focusY}%` }}
                    />
                    <div
                      className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${form.focusX}%`, top: `${form.focusY}%` }}
                    >
                      <div className="absolute inset-0 border-2 border-[#fde047] rounded-full opacity-90" />
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-[#fde047] -translate-y-1/2 opacity-90" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#fde047] -translate-x-1/2 opacity-90" />
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Click on the preview to set the zoom anchor, or drag the sliders.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── PRINT PREVIEW ── */}
          {form.slug && <PrintPreview key={form.slug} slug={form.slug} />}

          {/* ── VARIANTS — apparel only ── */}
          {form.category === "apparel" && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display tracking-widest">VARIANTS</CardTitle>
                <p className="text-xs text-muted-foreground">Sizes and colors available for this product.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Sizes */}
                <div className="space-y-2">
                  <Label>Available Sizes</Label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_SIZES.map((size) => (
                      <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={form.sizes.includes(size)}
                          onCheckedChange={() => toggleSize(size)}
                        />
                        <span className="text-sm font-mono">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Colors</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addColor}
                      className="text-xs text-[#fde047] h-6 px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add color
                    </Button>
                  </div>
                  {form.colors.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      No colors yet — add one to enable color selection in the shop.
                    </p>
                  )}
                  {form.colors.map((c, i) => {
                    const slugPattern = form.slug
                      ? `${form.slug}_${c.name.toLowerCase().replace(/\s+/g, "_") || "<name>"}`
                      : "<slug>_<name>";
                    return (
                      <div key={i} className="flex items-center gap-3 group">
                        <input
                          type="color"
                          value={c.hex || "#000000"}
                          onChange={(e) => updateColor(i, { hex: e.target.value })}
                          className="h-8 w-8 rounded border border-border cursor-pointer flex-shrink-0"
                          title="Pick color"
                        />
                        <Input
                          value={c.name}
                          onChange={(e) => updateColor(i, { name: e.target.value })}
                          placeholder="Color name (e.g. Black, Navy)"
                          className="flex-1"
                        />
                        <Input
                          value={c.hex}
                          onChange={(e) => {
                            const hex = e.target.value;
                            updateColor(i, { hex });
                          }}
                          placeholder="#000000"
                          className="w-28 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColor(i)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                  {form.colors.length > 0 && form.slug && (
                    <p className="text-[11px] text-muted-foreground">
                      Print file pattern: <span className="font-mono">{`${form.slug}_<colorname>.png`}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── FULFILLMENT ── */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">FULFILLMENT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={form.fulfillment_type}
                onValueChange={(v) => setF({ fulfillment_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Digital</SelectItem>
                  <SelectItem value="self">Self-Fulfilled (ship yourself)</SelectItem>
                  <SelectItem value="printer">Local Printer (sends printer email on order)</SelectItem>
                  <SelectItem value="printful">Printful (API — Coming Soon)</SelectItem>
                  <SelectItem value="printify">Printify (API — Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
              {isPOD && (
                <p className="text-xs text-muted-foreground italic">
                  API integration for {form.fulfillment_type === "printful" ? "Printful" : "Printify"} is coming in a future update. Orders will currently fall through to the default fulfillment path.
                </p>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ── Right column — sidebar ── */}
        <div className="space-y-6">

          {/* Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">VISIBILITY</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label htmlFor="live" className="text-base">Live on Site</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Toggle to publish or unpublish</p>
                </div>
                <Switch
                  id="live"
                  checked={form.isLive}
                  onCheckedChange={(v) => setF({ isLive: v })}
                  className="data-[state=checked]:bg-[#fde047]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="featured">Featured</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Shows in hero / featured row</p>
                </div>
                <Switch
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(v) => setF({ featured: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category summary */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest text-sm">CATEGORY</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className="text-xs uppercase tracking-widest"
              >
                {form.category}
              </Badge>
              {form.category === "accessories" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Size/color variant section hidden for accessories.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Save */}
          <div className="space-y-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
            >
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : isNew ? "CREATE PRODUCT" : "SAVE CHANGES"}
            </Button>
            {lastSaved && (
              <p className="text-xs text-muted-foreground text-center">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Utility: map new fulfillment_type → legacy fulfillment_route values ──────
function mapFulfillmentTypeToRoute(type: string): string {
  switch (type) {
    case "printer": return "local_printer";
    case "self": return "manual";
    case "printful": return "printful";
    case "printify": return "printify";
    case "none": return "manual";
    default: return "local_printer";
  }
}

// Map legacy fulfillment_route → new fulfillment_type (for loading existing records)
function mapLegacyRoute(route: string | undefined): string {
  switch (route) {
    case "local_printer": return "printer";
    case "manual": return "self";
    case "printful": return "printful";
    case "printify": return "printify";
    default: return "printer";
  }
}

export default ProductEdit;
