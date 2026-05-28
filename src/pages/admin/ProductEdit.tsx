import { useEffect, useState } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, X, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/admin";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

interface FormState {
  slug: string;
  name: string;
  description: string;
  humor: string;
  longDescription: string[];
  badAdviceTitle: string;
  badAdviceParagraphs: string[];
  price_dollars: string;
  isLive: boolean;
  featured: boolean;
  fit_type: string;
  sizes: string[];
  images: string[];
  badge: string;
  fulfillment_route: string;
  print_file_url: string;
  thumbnailFocalX: number;
  thumbnailFocalY: number;
}

const defaultForm = (): FormState => ({
  slug: "", name: "", description: "", humor: "",
  longDescription: [], badAdviceTitle: "", badAdviceParagraphs: [],
  price_dollars: "", isLive: false, featured: false, fit_type: "unisex",
  sizes: DEFAULT_SIZES, images: [], badge: "", fulfillment_route: "local_printer", print_file_url: "",
  thumbnailFocalX: 40, thumbnailFocalY: 40,
});

// Dynamic paragraph list editor
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
        <p className="text-xs text-muted-foreground italic">No paragraphs yet. Click "Add paragraph" to start.</p>
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

const ProductEdit = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromSlug = searchParams.get("from"); // static product slug to pre-populate from
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [initialized, setInitialized] = useState(false);

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

  useEffect(() => {
    if (initialized) return;

    if (!isNew && product) {
      // Editing existing DB product
      const ba = product.bad_advice as { title?: string; paragraphs?: string[] } | null;
      setForm({
        slug: product.slug ?? "",
        name: product.name ?? "",
        description: product.description ?? "",
        humor: product.humor ?? "",
        longDescription: (product.long_description as string[] | null) ?? [],
        badAdviceTitle: ba?.title ?? "",
        badAdviceParagraphs: ba?.paragraphs ?? [],
        price_dollars: product.price_cents ? (product.price_cents / 100).toFixed(2) : "",
        isLive: product.is_active && product.published,
        featured: product.featured ?? false,
        fit_type: product.fit_type ?? "unisex",
        sizes: product.sizes?.length ? product.sizes : DEFAULT_SIZES,
        badge: product.badge ?? "",
        images: (() => {
          if (product.images?.length) return product.images as string[];
          if ((product as Record<string, unknown>).image_url) return [(product as Record<string, unknown>).image_url as string];
          const sp = staticProducts.find((s) => s.id === product.slug);
          return sp?.images?.length ? sp.images : (sp?.image ? [sp.image] : []);
        })(),
        fulfillment_route: (product as Record<string, unknown>).fulfillment_route as string ?? "local_printer",
        print_file_url: (product as Record<string, unknown>).print_file_url as string ?? "",
        thumbnailFocalX: (product as Record<string, unknown>).thumbnail_focal_x as number ?? 40,
        thumbnailFocalY: (product as Record<string, unknown>).thumbnail_focal_y as number ?? 40,
      });
      setInitialized(true);
    } else if (isNew && fromSlug) {
      // Pre-populate from static catalog product
      const sp = staticProducts.find((p) => p.id === fromSlug);
      if (sp) {
        setForm({
          slug: sp.id,
          name: sp.name,
          description: sp.description ?? "",
          humor: sp.humor ?? "",
          longDescription: sp.longDescription ?? [],
          badAdviceTitle: sp.badAdvice?.title ?? "",
          badAdviceParagraphs: sp.badAdvice?.paragraphs ?? [],
          price_dollars: sp.price.toFixed(2),
          isLive: sp.published === true,
          featured: sp.featured === true,
          fit_type: sp.variants ? "mens_womens" : "unisex",
          sizes: sp.sizes ?? DEFAULT_SIZES,
          images: sp.images?.length ? sp.images : (sp.image ? [sp.image] : []),
          badge: sp.badge ?? "",
          fulfillment_route: "local_printer",
          print_file_url: "",
        });
        setInitialized(true);
      }
    } else if (isNew && !fromSlug) {
      setInitialized(true);
    }
  }, [product, isNew, fromSlug, initialized]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${form.slug || crypto.randomUUID()}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setForm((f) => ({ ...f, images: [...f.images, data.publicUrl] }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const removeImage = (url: string) =>
    setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));

  const handleSave = async () => {
    if (!form.name) return toast.error("Name is required");
    if (!form.price_dollars || isNaN(Number(form.price_dollars)))
      return toast.error("Valid price is required");

    setSaving(true);
    const slug = form.slug || slugify(form.name);
    const badAdvice = form.badAdviceTitle || form.badAdviceParagraphs.length > 0
      ? { title: form.badAdviceTitle, paragraphs: form.badAdviceParagraphs.filter(Boolean) }
      : null;

    const payload = {
      slug,
      name: form.name,
      description: form.description || null,
      humor: form.humor || null,
      long_description: form.longDescription.filter(Boolean).length > 0 ? form.longDescription.filter(Boolean) : null,
      bad_advice: badAdvice,
      price_cents: Math.round(Number(form.price_dollars) * 100),
      is_active: form.isLive,
      published: form.isLive,
      status: form.isLive ? "published" : "draft",
      featured: form.featured,
      fit_type: form.fit_type,
      sizes: form.sizes,
      images: form.images,
      image_url: form.images[0] ?? null,
      badge: form.badge || null,
      fulfillment_route: form.fulfillment_route,
      print_file_url: form.print_file_url || null,
      thumbnail_focal_x: form.thumbnailFocalX,
      thumbnail_focal_y: form.thumbnailFocalY,
    };

    let error;
    if (!isNew && !fromSlug) {
      // Stamp went_live_at on first publish (only if not already set)
      if (form.isLive) {
        const { data: existing } = await supabase
          .from("products")
          .select("went_live_at")
          .eq("id", id!)
          .maybeSingle();
        if (!existing?.went_live_at) {
          (payload as Record<string, unknown>).went_live_at = new Date().toISOString();
        }
      }
      ({ error } = await supabase.from("products").update(payload).eq("id", id!));
    } else {
      // Insert new (either truly new or first-time save of static product)
      if (form.isLive) {
        (payload as Record<string, unknown>).went_live_at = new Date().toISOString();
      }
      ({ error } = await supabase.from("products").insert([payload]));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isNew ? "Product created" : "Saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    navigate("/admin/products");
  };

  if (!isNew && isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const setF = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to products
        </Button>
        {form.slug && (
          <a href={`/product/${form.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="text-xs font-display tracking-widest">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />View on Site
            </Button>
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column — content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic details */}
          <Card>
            <CardHeader><CardTitle className="font-display tracking-widest">DETAILS</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setF({ name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setF({ slug: slugify(e.target.value) })}
                  placeholder={slugify(form.name) || "auto-generated"}
                />
                <p className="text-xs text-muted-foreground">Auto-generated from name if left blank.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Price (USD) *</Label>
                  <Input type="number" step="0.01" value={form.price_dollars} onChange={(e) => setF({ price_dollars: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Badge</Label>
                  <Input value={form.badge} onChange={(e) => setF({ badge: e.target.value })} placeholder="e.g. NEW, HOT" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product copy */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">PRODUCT COPY</CardTitle>
              <p className="text-xs text-muted-foreground">This is Opie's voice — keep it raw.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Main Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setF({ description: e.target.value })}
                  rows={4}
                  className="resize-none"
                  placeholder="The main product copy shown on the product page."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Humor / Tagline</Label>
                <Input
                  value={form.humor}
                  onChange={(e) => setF({ humor: e.target.value })}
                  placeholder="Short one-liner shown on the card and as the pull-quote callout"
                />
              </div>
              <ParagraphList
                label="Extended Description (Long Copy)"
                paragraphs={form.longDescription}
                onChange={(p) => setF({ longDescription: p })}
                placeholder="Additional context, extended story, or extra copy shown on the product page..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Bad Bartender Advice */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">BAD BARTENDER ADVICE</CardTitle>
              <p className="text-xs text-muted-foreground">Opie's story / dialogue block shown at the bottom of the product page.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Section Title</Label>
                <Input
                  value={form.badAdviceTitle}
                  onChange={(e) => setF({ badAdviceTitle: e.target.value })}
                  placeholder="e.g. My Name is Opie and I'll Be Your Bartender:"
                />
              </div>
              <ParagraphList
                label="Story / Advice Paragraphs"
                paragraphs={form.badAdviceParagraphs}
                onChange={(p) => setF({ badAdviceParagraphs: p })}
                placeholder="Paragraph or dialogue line..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader><CardTitle className="font-display tracking-widest">IMAGES</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {form.images.map((url) => (
                  <div key={url} className="relative aspect-square group">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-sm border border-border" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute top-1 right-1 bg-black/80 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#fde047] transition text-muted-foreground hover:text-[#fde047]">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <><Upload className="h-5 w-5" /><span className="text-[10px] uppercase tracking-wider">Upload</span></>
                  )}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">First image is used as the thumbnail. Drag to reorder (coming soon).</p>

              {/* Focal point picker */}
              {form.images[0] && (
                <div className="pt-2 border-t border-border space-y-2">
                  <Label className="text-xs tracking-wider uppercase">Thumbnail Crop Center</Label>
                  <p className="text-[11px] text-muted-foreground">Click anywhere on the preview to set where the zoom anchors. The crosshair shows the current center.</p>
                  <div
                    className="relative aspect-square overflow-hidden border border-border cursor-crosshair max-w-[180px]"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setF({
                        thumbnailFocalX: Math.round(((e.clientX - rect.left) / rect.width) * 100),
                        thumbnailFocalY: Math.round(((e.clientY - rect.top) / rect.height) * 100),
                      });
                    }}
                  >
                    <img
                      src={form.images[0]}
                      alt=""
                      className="w-full h-full object-cover scale-[1.35] pointer-events-none"
                      style={{ transformOrigin: `${form.thumbnailFocalX}% ${form.thumbnailFocalY}%` }}
                    />
                    {/* Crosshair */}
                    <div
                      className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${form.thumbnailFocalX}%`, top: `${form.thumbnailFocalY}%` }}
                    >
                      <div className="absolute inset-0 border-2 border-[#fde047] rounded-full opacity-90" />
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-[#fde047] -translate-y-1/2 opacity-90" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#fde047] -translate-x-1/2 opacity-90" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{form.thumbnailFocalX}% × {form.thumbnailFocalY}%</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Print File URL */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">PRINT FILE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={form.print_file_url}
                onChange={(e) => setF({ print_file_url: e.target.value })}
                placeholder="https://drive.google.com/…"
              />
              <p className="text-xs text-muted-foreground">
                Google Drive or Supabase Storage URL for the printer's high-res print-ready file (300 DPI+ PNG/PDF). Included in the fulfillment CSV emailed to the printer on each order.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column — settings ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-display tracking-widest">VISIBILITY</CardTitle></CardHeader>
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
                <Label htmlFor="featured">Featured</Label>
                <Switch id="featured" checked={form.featured} onCheckedChange={(v) => setF({ featured: v })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display tracking-widest text-sm">FIT</CardTitle></CardHeader>
            <CardContent>
              <Select value={form.fit_type} onValueChange={(v) => setF({ fit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unisex">Unisex</SelectItem>
                  <SelectItem value="mens_womens">Men's &amp; Women's</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display tracking-widest text-sm">FULFILLMENT</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={form.fulfillment_route} onValueChange={(v) => setF({ fulfillment_route: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local_printer">Local Printer</SelectItem>
                  <SelectItem value="printify">Printify</SelectItem>
                  <SelectItem value="printful">Printful</SelectItem>
                  <SelectItem value="manual">Manual / Self-fulfill</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isNew ? "CREATE PRODUCT" : "SAVE CHANGES"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductEdit;
