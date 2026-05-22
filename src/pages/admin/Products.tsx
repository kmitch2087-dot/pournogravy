import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as staticProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, Search, Pencil, Trash2, CalendarDays } from "lucide-react";
import { fmtMoney, slugify } from "@/lib/admin";
import { toast } from "sonner";

interface DbProduct {
  id: string; slug: string; name: string; price_cents: number; currency: string;
  is_active: boolean; published: boolean; status: string; image_url: string | null;
  featured: boolean;
}

type MergedProduct = {
  id: string | null;       // null = static-only, not yet in DB
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  is_active: boolean;
  image_url: string | null;
  isStatic: boolean;       // came from products.ts
  inDrop: boolean;
};

const Products = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: dbProducts = [], isLoading } = useQuery<DbProduct[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price_cents, currency, is_active, published, status, image_url, featured")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbProduct[];
    },
  });

  // Fetch which product IDs are in any merch drop
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

    // DB products first
    for (const p of dbProducts) {
      result.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price_cents: p.price_cents,
        currency: p.currency,
        is_active: p.is_active && p.published,
        image_url: p.image_url,
        isStatic: false,
        inDrop: dropIdSet.has(p.id),
      });
    }

    // Static products not yet in DB
    for (const sp of staticProducts) {
      if (!dbBySlug.has(sp.id)) {
        result.push({
          id: null,
          slug: sp.id,
          name: sp.name,
          price_cents: Math.round(sp.price * 100),
          currency: "USD",
          is_active: sp.published === true,
          image_url: sp.image ?? sp.images?.[0] ?? null,
          isStatic: true,
          inDrop: false,
        });
      }
    }

    return result;
  }, [dbProducts, dropIdSet]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return merged;
    return merged.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [merged, search]);

  const handleToggleLive = async (p: MergedProduct, newVal: boolean) => {
    const key = p.id ?? p.slug;
    setToggling(key);
    try {
      if (p.id) {
        // DB product — update in place
        const { error } = await supabase.from("products").update({
          is_active: newVal,
          published: newVal,
          status: newVal ? "published" : "draft",
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        // Static-only product — create a DB row
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

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("products").delete().eq("id", toDelete.id);
    if (error) { toast.error(error.message); } else {
      toast.success(`Deleted ${toDelete.name}`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    }
    setToDelete(null);
  };

  const handleEdit = (p: MergedProduct) => {
    if (p.id) {
      navigate(`/admin/products/${p.id}`);
    } else {
      navigate(`/admin/products/new?from=${p.slug}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest">
          <Link to="/admin/products/new"><Plus className="h-4 w-4 mr-1.5" /> NEW PRODUCT</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {search ? "Nothing matches that." : "No products found."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center w-28">Live</TableHead>
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
                          <CalendarDays className="inline h-3.5 w-3.5 ml-1.5 text-[#fde047] -mt-0.5" title="In a merch drop" />
                        )}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{p.slug}</span>
                        {p.isStatic && (
                          <Badge className="text-[9px] px-1 py-0 bg-muted text-muted-foreground border-border">CATALOG</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-display tracking-wider">
                      {fmtMoney(p.price_cents, p.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={(v) => handleToggleLive(p, v)}
                          className="data-[state=checked]:bg-[#fde047]"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes <strong>{toDelete?.name}</strong> from the database. Existing orders unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
