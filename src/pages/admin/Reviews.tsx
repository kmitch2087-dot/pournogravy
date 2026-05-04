import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const StarRow = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className="h-3 w-3"
        fill={n <= rating ? "#fde047" : "none"}
        stroke={n <= rating ? "#fde047" : "currentColor"}
      />
    ))}
  </div>
);

const Reviews = () => {
  const qc = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_approved: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review approved");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (reviews ?? []).filter((r) => !r.is_approved);
  const approved = (reviews ?? []).filter((r) => r.is_approved);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display tracking-widest text-sm uppercase text-muted-foreground">
          Pending ({pending.length})
        </h2>
        <Card className="overflow-hidden">
          {pending.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No pending reviews.</p>
          ) : (
            <ReviewTable
              rows={pending}
              showApprove
              onApprove={(id) => approve.mutate(id)}
              onDelete={(id) => remove.mutate(id)}
              busy={approve.isPending || remove.isPending}
            />
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display tracking-widest text-sm uppercase text-muted-foreground">
          Approved ({approved.length})
        </h2>
        <Card className="overflow-hidden">
          {approved.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No approved reviews yet.</p>
          ) : (
            <ReviewTable
              rows={approved}
              onDelete={(id) => remove.mutate(id)}
              busy={remove.isPending}
            />
          )}
        </Card>
      </section>
    </div>
  );
};

const ReviewTable = ({
  rows,
  showApprove,
  onApprove,
  onDelete,
  busy,
}: {
  rows: Record<string, unknown>[];
  showApprove?: boolean;
  onApprove?: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Reviewer</TableHead>
        <TableHead>Product</TableHead>
        <TableHead>Rating</TableHead>
        <TableHead>Review</TableHead>
        <TableHead>Date</TableHead>
        <TableHead />
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((r) => (
        <TableRow key={r.id as string}>
          <TableCell className="font-medium text-sm">{r.reviewer_name as string}</TableCell>
          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
            {r.product_slug as string}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              <StarRow rating={r.rating as number} />
              <span className="text-xs text-muted-foreground">{r.rating as number}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm max-w-[200px]">
            {r.body ? (
              <span className="line-clamp-2 text-muted-foreground">{r.body as string}</span>
            ) : (
              <Badge variant="outline" className="text-[10px]">no text</Badge>
            )}
          </TableCell>
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(r.created_at as string), "MMM d, yyyy")}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              {showApprove && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                  disabled={busy}
                  onClick={() => onApprove?.(r.id as string)}
                  title="Approve"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive/80"
                disabled={busy}
                onClick={() => onDelete(r.id as string)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default Reviews;
