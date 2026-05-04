import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Search, Pencil, Trash2 } from "lucide-react";
import { fmtMoney, statusClass } from "@/lib/admin";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Products = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price_cents, currency, status, is_active, image_url, category, featured")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("products").delete().eq("id", toDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Deleted ${toDelete.name}`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    }
    setToDelete(null);
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
          <Link to="/admin/products/new">
            <Plus className="h-4 w-4 mr-1.5" /> NEW PRODUCT
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {search ? "Nothing matches that." : "No products yet. Create your first one."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-10 w-10 object-cover rounded-sm border border-border"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded-sm" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/admin/products/${p.id}`}
                      className="font-medium hover:text-[#fde047] transition"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{p.slug}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.category ?? "—"}</TableCell>
                  <TableCell className="text-right font-display tracking-wider">
                    {fmtMoney(p.price_cents, p.currency)}
                  </TableCell>
                  <TableCell>
                    <span className={statusClass(p.status)}>{p.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon">
                        <Link to={`/admin/products/${p.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete({ id: p.id, name: p.name })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{toDelete?.name}</strong> from the database. Existing orders are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
