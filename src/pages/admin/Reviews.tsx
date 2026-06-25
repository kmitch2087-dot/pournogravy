import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  product_slug: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  body: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  reviewer_state: string | null;
  verified_purchase: boolean;
  review_token: string | null;
  order_id: string | null;
}

type FilterTab = "all" | "pending" | "published" | "verified";

const FILTER_LABELS: Record<FilterTab, string> = {
  all:       "All",
  pending:   "Pending",
  published: "Published",
  verified:  "Verified Only",
};

// ─── Star row ─────────────────────────────────────────────────────────────────

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

// ─── Expandable body ──────────────────────────────────────────────────────────

function BodyCell({ body }: { body: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!body) return <Badge variant="outline" className="text-[10px]">no text</Badge>;

  const isLong = body.length > 100;
  const display = expanded || !isLong ? body : body.slice(0, 100) + "…";

  return (
    <div className="text-sm max-w-[220px]">
      <span className="text-muted-foreground">{display}</span>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 text-[10px] text-[#fde047]/70 hover:text-[#fde047] inline-flex items-center gap-0.5"
        >
          {expanded
            ? <><ChevronUp className="h-3 w-3" />less</>
            : <><ChevronDown className="h-3 w-3" />more</>}
        </button>
      )}
    </div>
  );
}

// ─── Reviews component ────────────────────────────────────────────────────────

const Reviews = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const { data: allReviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const setApproved = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_approved: approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      toast.success(approved ? "Review published" : "Review unpublished");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["home-reviews"] });
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

  const filtered: Review[] = (() => {
    switch (activeTab) {
      case "pending":   return allReviews.filter((r) => !r.is_approved);
      case "published": return allReviews.filter((r) => r.is_approved);
      case "verified":  return allReviews.filter((r) => r.verified_purchase);
      default:          return allReviews;
    }
  })();

  const tabCount = (tab: FilterTab): number => {
    switch (tab) {
      case "pending":   return allReviews.filter((r) => !r.is_approved).length;
      case "published": return allReviews.filter((r) => r.is_approved).length;
      case "verified":  return allReviews.filter((r) => r.verified_purchase).length;
      default:          return allReviews.length;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["all", "pending", "published", "verified"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2 text-xs font-display tracking-widest uppercase border-b-2 -mb-px transition",
              activeTab === tab
                ? "border-[#fde047] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {FILTER_LABELS[tab]}
            <span className="ml-1.5 text-muted-foreground font-sans normal-case tracking-normal">
              ({tabCount(tab)})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="py-14 text-center text-sm text-muted-foreground">
            {allReviews.length === 0
              ? "No reviews yet. Once customers leave reviews they'll appear here."
              : "No reviews match this filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    {/* Reviewer name + verified badge */}
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm whitespace-nowrap">{r.reviewer_name}</p>
                        {r.verified_purchase && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] px-1.5 py-0 font-normal">
                            Verified Purchase
                          </Badge>
                        )}
                        {r.reviewer_state && (
                          <p className="text-[9px] text-muted-foreground/60">{r.reviewer_state}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Product slug */}
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {r.product_slug}
                    </TableCell>

                    {/* Stars + numeric */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <StarRow rating={r.rating} />
                        <span className="text-[10px] text-muted-foreground">{r.rating}/5</span>
                      </div>
                    </TableCell>

                    {/* Expandable body */}
                    <TableCell>
                      <BodyCell body={r.body} />
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      {r.is_approved ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] px-2 py-0.5 whitespace-nowrap">
                          Live
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[9px] px-2 py-0.5 whitespace-nowrap">
                          Hidden
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {r.is_approved ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                            disabled={setApproved.isPending}
                            onClick={() => setApproved.mutate({ id: r.id, approved: false })}
                            title="Unpublish"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 gap-1"
                            disabled={setApproved.isPending}
                            onClick={() => setApproved.mutate({ id: r.id, approved: true })}
                            title="Publish"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Publish
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive/80"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(r.id)}
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
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reviews;
