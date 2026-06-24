import { useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SEO from "@/components/SEO";

interface OrderRow {
  id: string;
  email: string | null;
  review_submitted_at: string | null;
}

interface OrderItem {
  id: string;
  product_snapshot: Record<string, unknown> | null;
  quantity: number;
}

const StarPicker = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <div className="flex gap-1" aria-label="Star rating">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className="focus:outline-none"
        aria-label={`${n} star${n !== 1 ? "s" : ""}`}
      >
        <Star
          className="h-8 w-8 transition-colors"
          fill={n <= value ? "#fde047" : "none"}
          stroke={n <= value ? "#fde047" : "hsl(var(--muted-foreground))"}
          strokeWidth={1.5}
        />
      </button>
    ))}
  </div>
);

export default function ReviewSubmit() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Redirect to /reviews if no token
  if (!token) return <Navigate to="/reviews" replace />;

  // Validate token
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery<OrderRow | null>({
    queryKey: ["review-token", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, email, review_submitted_at")
        .eq("review_token", token)
        .maybeSingle();
      if (error) throw error;
      return data as OrderRow | null;
    },
    staleTime: Infinity,
  });

  // Fetch order items once we have a valid order
  const { data: items, isLoading: itemsLoading } = useQuery<OrderItem[]>({
    queryKey: ["review-order-items", order?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_snapshot, quantity")
        .eq("order_id", order!.id);
      if (error) throw error;
      const rows = (data ?? []) as OrderItem[];
      // Auto-select if only one product
      if (rows.length === 1) {
        const slug = rows[0].product_snapshot?.slug as string | null;
        if (slug) setSelectedProduct(slug);
      }
      return rows;
    },
    enabled: !!order?.id && !order.review_submitted_at,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!order || !selectedProduct || !rating || !body.trim() || !reviewerName.trim()) {
        throw new Error("Please fill out all required fields.");
      }
      const { error: revErr } = await supabase.from("product_reviews").insert({
        product_slug: selectedProduct,
        order_id: order.id,
        rating,
        body: body.trim(),
        reviewer_name: reviewerName.trim(),
        verified_purchase: true,
        is_approved: true,
      });
      if (revErr) throw revErr;
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ review_submitted_at: new Date().toISOString() })
        .eq("review_token", token!);
      if (orderErr) throw orderErr;
    },
    onSuccess: () => setSubmitted(true),
  });

  const isLoading = orderLoading || itemsLoading;

  // Inline: helper to extract product name from snapshot
  const getProductName = (item: OrderItem) =>
    (item.product_snapshot?.name as string | null) ?? "Unknown Product";
  const getProductSlug = (item: OrderItem) =>
    (item.product_snapshot?.slug as string | null) ?? "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <SEO
        title="Leave a Review"
        description="Share your experience with POURnogravy gear."
        url="https://pournogravy.com/review"
        imageAlt="Leave a POURnogravy review"
      />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-mono tracking-widest text-[#fde047] uppercase mb-2">POURnogravy</p>
          <h1 className="font-marker text-3xl tracking-wider">WHAT'S YOUR VERDICT?</h1>
          <p className="text-muted-foreground text-sm mt-2">Your review helps other bartenders make the right call.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#fde047]" />
          </div>
        ) : orderError || !order ? (
          <div className="text-center py-12 border border-border rounded-lg p-6">
            <p className="text-destructive font-mono text-sm">This review link is invalid or has expired.</p>
          </div>
        ) : order.review_submitted_at ? (
          <div className="text-center py-12 border border-border rounded-lg p-6 space-y-3">
            <Star className="h-8 w-8 mx-auto" fill="#fde047" stroke="#fde047" />
            <p className="font-marker text-lg tracking-wider">Already submitted!</p>
            <p className="text-muted-foreground text-sm">You've already reviewed this order. Thank you!</p>
          </div>
        ) : submitted ? (
          <div className="text-center py-12 border border-[#fde047]/30 rounded-lg p-6 space-y-3">
            <Star className="h-8 w-8 mx-auto" fill="#fde047" stroke="#fde047" />
            <p className="font-marker text-xl tracking-wider text-[#fde047]">THANKS!</p>
            <p className="text-muted-foreground text-sm">Your review has been submitted and is live on the site.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg p-6 space-y-5">
            {/* Product selector */}
            {items && items.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Which product?</Label>
                <div className="space-y-2">
                  {items.map((item) => {
                    const slug = getProductSlug(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedProduct(slug)}
                        className={[
                          "w-full text-left px-4 py-3 border text-sm transition-colors rounded",
                          selectedProduct === slug
                            ? "border-[#fde047] bg-[#fde047]/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/40",
                        ].join(" ")}
                      >
                        {getProductName(item)}
                        {item.quantity > 1 && (
                          <span className="text-xs text-muted-foreground ml-2">×{item.quantity}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Star rating */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Rating *</Label>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            {/* Reviewer name */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Your name *</Label>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="First name or handle"
                maxLength={60}
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sum it up in a line"
                maxLength={80}
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Review *</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell it like it is — what'd you think?"
                rows={4}
                className="resize-none"
                maxLength={1000}
              />
            </div>

            {submitMutation.error && (
              <p className="text-destructive text-xs">
                {submitMutation.error instanceof Error ? submitMutation.error.message : "Something went wrong."}
              </p>
            )}

            <Button
              className="w-full bg-[#fde047] text-black hover:bg-[#fde047]/90 font-marker tracking-widest"
              onClick={() => submitMutation.mutate()}
              disabled={
                submitMutation.isPending ||
                !rating ||
                !body.trim() ||
                !reviewerName.trim() ||
                !selectedProduct
              }
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              SUBMIT REVIEW
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Verified purchase · your review goes live immediately
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
