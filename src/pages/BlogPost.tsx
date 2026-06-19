import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image_url: string | null;
  tags: string[];
  published_at: string | null;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError } = useQuery<BlogPost | null>({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BlogPost | null;
    },
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 md:pt-20">
        <div className="container mx-auto px-4 py-20 max-w-3xl space-y-6 animate-pulse">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="aspect-video bg-muted rounded" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen pt-16 md:pt-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="font-display text-4xl tracking-widest text-muted-foreground">404</p>
          <p className="font-marker text-lg italic tracking-wider text-white">
            That shift ended early. Post not found.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-display tracking-widest text-[#fde047] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> BACK TO BLOG
          </Link>
        </div>
      </div>
    );
  }

  const paragraphs = (post.content ?? "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <SEO
        title={post.title}
        description={post.excerpt ?? `Read ${post.title} on the Pournogravy blog.`}
        url={`https://pournogravy.com/blog/${post.slug}`}
      />

      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {/* Back */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-display tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> ALL POSTS
        </Link>

        {/* Featured image */}
        {post.featured_image_url && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="aspect-video overflow-hidden mb-8 border border-border"
          >
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Meta */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4 mb-8"
        >
          <div className="flex flex-wrap items-center gap-3">
            {post.tags?.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-marker tracking-widest uppercase text-[#fde047] border border-[#fde047]/30 px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
            {post.published_at && (
              <span className="flex items-center gap-1.5 text-[10px] font-marker tracking-wider text-muted-foreground uppercase ml-auto">
                <CalendarDays className="h-3 w-3" />
                {new Date(post.published_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl md:text-6xl tracking-wider leading-[1] text-foreground">
            {post.title.toUpperCase()}
          </h1>

          {post.excerpt && (
            <p className="font-marker text-base md:text-lg text-white italic tracking-wider border-l-2 border-[#fde047]/40 pl-4">
              {post.excerpt}
            </p>
          )}
        </motion.div>

        {/* Divider */}
        <div
          className="h-px mb-8"
          style={{ background: "linear-gradient(90deg, #fde047 0%, transparent 100%)" }}
        />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-5"
        >
          {paragraphs.map((para, i) => (
            <p key={i} className="text-base md:text-lg text-foreground/90 leading-relaxed">
              {para}
            </p>
          ))}
        </motion.div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-display tracking-widest text-muted-foreground hover:text-[#fde047] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> BACK TO THE SHIFT LOG
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
