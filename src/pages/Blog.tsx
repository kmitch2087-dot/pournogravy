import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  tags: string[];
  published_at: string | null;
}

const BlogCard = ({ post, index }: { post: BlogPost; index: number }) => (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    className="group border border-border bg-card hover:border-[#fde047] transition-colors"
  >
    <Link to={`/blog/${post.slug}`} className="block">
      <div className="aspect-video overflow-hidden bg-muted">
        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                "radial-gradient(ellipse at 30% 50%, rgba(253,224,71,0.15), transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(255,23,68,0.12), transparent 60%), hsl(var(--muted))",
            }}
          />
        )}
      </div>

      <div className="p-5 space-y-3">
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-marker tracking-widest uppercase text-[#fde047] border border-[#fde047]/30 px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h2 className="font-display text-lg tracking-wider leading-tight group-hover:text-[#fde047] transition-colors">
          {post.title.toUpperCase()}
        </h2>

        {post.excerpt && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          {post.published_at && (
            <span className="flex items-center gap-1.5 text-[10px] font-marker tracking-wider text-muted-foreground uppercase">
              <CalendarDays className="h-3 w-3" />
              {new Date(post.published_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs font-display tracking-widest text-[#fde047] group-hover:gap-2 transition-all">
            READ MORE <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  </motion.article>
);

const Blog = () => {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["public-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image_url, tags, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <SEO
        title="Blog"
        description="Opinions, rants, and recipes for disaster from the Pournogravy crew."
        url="https://pournogravy.com/blog"
      />

      {/* Header */}
      <section className="relative border-b border-border noise-overlay overflow-hidden">
        <div
          className="absolute inset-0 -z-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(253,224,71,0.08), transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,23,68,0.08), transparent 50%)",
          }}
        />
        <div className="container mx-auto px-4 pt-5 pb-6 md:pt-8 md:pb-10 relative">
          <p
            className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-4"
            style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
          >
            The Shift Log
          </p>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none mb-4">
            LAST CALL<br />FOR CONTENT
          </h1>
          <p className="font-marker text-base md:text-lg text-white italic tracking-wider max-w-md">
            Opinions. Rants. Recipes for disaster.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border bg-card animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !posts?.length ? (
          <div className="py-24 text-center">
            <p className="font-marker text-lg text-white italic tracking-wider">
              Nothing posted yet. Check back when the shift slows down.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <BlogCard key={post.id} post={post} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Blog;
