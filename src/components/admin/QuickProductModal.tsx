import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "industry-truths", label: "Industry Truths" },
  { value: "bar-wisdom", label: "Bar Wisdom" },
  { value: "shift-life", label: "Shift Life" },
  { value: "guest-behavior", label: "Guest Behavior" },
  { value: "pour-decisions", label: "Pour Decisions" },
];

interface QuickProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: { id: string; name: string }) => void;
}

export const QuickProductModal = ({ open, onClose, onCreated }: QuickProductModalProps) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price_dollars: "",
    category: "industry-truths",
    description: "",
    humor: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product needs a name"); return; }
    const price = parseFloat(form.price_dollars);
    if (isNaN(price) || price <= 0) { toast.error("Enter a valid price"); return; }

    setSaving(true);
    try {
      const slug = slugify(form.name);
      const { data, error } = await supabase.from("products").insert({
        slug,
        name: form.name.trim(),
        description: form.description.trim(),
        humor: form.humor.trim(),
        category: form.category,
        price_cents: Math.round(price * 100),
        currency: "usd",
        status: "draft",
        is_active: false,
        featured: false,
        fit_type: "unisex",
        sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
        images: [],
      }).select("id, name").single();

      if (error) throw error;
      toast.success(`"${data.name}" created — finish editing it from Products.`);
      onCreated({ id: data.id, name: data.name });
      setForm({ name: "", price_dollars: "", category: "industry-truths", description: "", humor: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-lg">QUICK ADD PRODUCT</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Creates a draft. Full details (images, variants) editable from the Products tab.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input placeholder="e.g. Last Call Crew Neck" value={form.name} onChange={set("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price (USD) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="27.99" value={form.price_dollars} onChange={set("price_dollars")} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="The product description shown to customers." rows={2} value={form.description} onChange={set("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Humor Line</Label>
            <Input placeholder="The zinger shown on the product card." value={form.humor} onChange={set("humor")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create & Add to Drop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
