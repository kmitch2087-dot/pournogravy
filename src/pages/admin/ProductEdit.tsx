import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PRODUCT_STATUSES, slugify } from "@/lib/admin";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const ProductEdit = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    humor: "",
    category: "",
    price_dollars: "",
    status: "draft" as (typeof PRODUCT_STATUSES)[number],
    is_active: true,
    featured: false,
    fit_type: "unisex",
    sizes: DEFAULT_SIZES,
    images: [] as string[],
    badge: "",
    fulfillment_route: "local_printer",
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (!product) return;
    setForm({
      slug: product.slug,
      name: product.name,
      description: product.description ?? "",
      humor: product.humor ?? "",
      category: product.category ?? "",
      price_dollars: (product.price_cents / 100).toFixed(2),
      status: product.status as (typeof PRODUCT_STATUSES)[number],
      is_active: product.is_active,
      featured: product.featured,
      fit_type: product.fit_type,
      sizes: product.sizes && product.sizes.length > 0 ? product.sizes : DEFAULT_SIZES,
      images: product.images ?? [],
      badge: product.badge ?? "",
      fulfillment_route: (product as Record<string, unknown>).fulfillment_route as string ?? "local_printer",
    });
  }, [product]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${form.slug || crypto.randomUUID()}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("products").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
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
    const payload = {
      slug: form.slug || slugify(form.name),
      name: form.name,
      description: form.description || null,
      humor: form.humor || null,
      category: form.category || null,
      price_cents: Math.round(Number(form.price_dollars) * 100),
      status: form.status,
      is_active: form.is_active,
      featured: form.featured,
      fit_type: form.fit_type,
      sizes: form.sizes,
      images: form.images,
      image_url: form.images[0] ?? null,
      badge: form.badge || null,
      published: form.status === "published",
      fulfillment_route: form.fulfillment_route,
    };

    const { error } = isNew
      ? await supabase.from("products").insert([payload])
      : await supabase.from("products").update(payload).eq("id", id!);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isNew ? "Product created" : "Saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["public-products"] });
    navigate("/admin/products");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to products
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">DETAILS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder={slugify(form.name)}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from name if blank.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Short description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Humor / tagline</Label>
                <Input
                  value={form.humor}
                  onChange={(e) => setForm({ ...form, humor: e.target.value })}
                  placeholder="Short one-liner shown on the card"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Badge</Label>
                  <Input
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="e.g. NEW"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">IMAGES</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {form.images.map((url) => (
                  <div key={url} className="relative aspect-square group">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-sm border border-border" />
                    <button
                      onClick={() => removeImage(url)}
                      className="absolute top-1 right-1 bg-black/80 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#fde047] transition text-muted-foreground hover:text-[#fde047]">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px] uppercase tracking-wider">Upload</span>
                    </>
                  )}
                  <input
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
              </div>
              <p className="text-xs text-muted-foreground">First image is used as the thumbnail.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">PRICING</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Price (USD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price_dollars}
                  onChange={(e) => setForm({ ...form, price_dollars: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest">VISIBILITY</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Featured</Label>
                <Switch
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fit type</Label>
                <Select
                  value={form.fit_type}
                  onValueChange={(v) => setForm({ ...form, fit_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unisex">Unisex</SelectItem>
                    <SelectItem value="mens_womens">Men's & Women's</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-widest text-sm">FULFILLMENT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Route orders to</Label>
                <Select
                  value={form.fulfillment_route}
                  onValueChange={(v) => setForm({ ...form, fulfillment_route: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local_printer">🖨️ Local Printer</SelectItem>
                    <SelectItem value="printful">Printful</SelectItem>
                    <SelectItem value="printify">Printify</SelectItem>
                    <SelectItem value="manual">Manual / Self-fulfill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.fulfillment_route === "local_printer" && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Orders email to your printer with artwork specs. Configure the printer address and print requirements in{" "}
                  <a href="/admin/settings" className="text-[#fde047] hover:underline">Settings → Fulfillment</a>.
                </p>
              )}
              {form.fulfillment_route === "printful" && (
                <p className="text-[11px] text-muted-foreground">Premium — embroidery-capable. Wires via Printful API (Phase 2).</p>
              )}
              {form.fulfillment_route === "printify" && (
                <p className="text-[11px] text-muted-foreground">Low-cost, large catalog. Wires via Printify API (Phase 2).</p>
              )}
              {form.fulfillment_route === "manual" && (
                <p className="text-[11px] text-muted-foreground">You ship it yourself. No automatic fulfillment triggered.</p>
              )}
            </CardContent>
          </Card>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isNew ? "CREATE" : "SAVE CHANGES"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductEdit;
