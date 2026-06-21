import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const StarRow = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className="h-4 w-4"
        fill={n <= rating ? "#fde047" : "none"}
        stroke={n <= rating ? "#fde047" : "currentColor"}
        strokeWidth={1.5}
      />
    ))}
  </div>
);

function shortProductName(slug: string) {
  return slug
    .replace(/-(tee|hoodie|tank|shirt|hat|cap|tshirt|t-shirt)$/, "")
    .replace(/-/g, " ")
    .toUpperCase();
}

const Reviews = () => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["public-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, body, product_slug, created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const avgRating = reviews?.length
    ? reviews.reduce((s, r) => s + (r.rating as number), 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-20">
      <SEO
        title="Reviews"
        description="Real talk from real bartenders. See what the industry thinks of Pournogravy gear."
        url="https://pournogravy.com/reviews"
        imageAlt="POURnogravy customer reviews"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-marker text-4xl md:text-5xl tracking-wider mb-3">
            WHAT THE BAR SAYS
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase font-mono">
            Real talk from real bartenders
          </p>
          {reviews && reviews.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <StarRow rating={Math.round(avgRating)} />
              <span className="font-mono text-sm text-muted-foreground">
                {avgRating.toFixed(1)} average · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-[#fde047] border-t-transparent animate-spin" />
          </div>
        ) : !reviews?.length ? (
          <div className="text-center py-20">
            <p className="font-marker text-xl tracking-wider text-muted-foreground">
              No reviews yet — be the first.
            </p>
            <Link
              to="/shop"
              className="inline-block mt-6 px-8 py-3 bg-[#fde047] text-black font-marker tracking-widest text-sm hover:bg-[#fbbf24] transition-colors"
            >
              SHOP NOW
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {reviews.map((r) => (
              <div
                key={r.id as string}
                className="border border-border bg-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <StarRow rating={r.rating as number} />
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {new Date(r.created_at as string).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {r.body && (
                  <p className="text-sm leading-relaxed text-foreground/90">
                    "{r.body as string}"
                  </p>
                )}

                <div className="mt-auto pt-2 border-t border-border/50 space-y-1">
                  <span className="font-marker text-sm tracking-wider block">
                    — {r.reviewer_name as string}
                  </span>
                  {r.product_slug && (
                    <Link
                      to={`/product/${r.product_slug}`}
                      className="text-xs font-mono text-[#fde047] hover:underline block"
                    >
                      {shortProductName(r.product_slug as string)}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {reviews && reviews.length > 0 && (
          <div className="text-center mt-14">
            <p className="font-marker text-lg tracking-wider mb-4">
              Ready to add your name to the wall?
            </p>
            <Link
              to="/shop"
              className="inline-block px-10 py-3 bg-[#fde047] text-black font-marker tracking-widest text-sm hover:bg-[#fbbf24] transition-colors"
            >
              SHOP NOW
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
