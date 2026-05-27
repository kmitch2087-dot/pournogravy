import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Upload, Loader2, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image_url: string | null;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const defaultForm = (): Omit<BlogPost, "id" | "created_at"> => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image_url: "",
  tags: [],
  published: false,
  published_at: null,
});

// ─── Editor ──────────────────────────────────────────────────────────────────

const PostEditor = ({
  initial,
  onSave,
  onBack,
}: {
  initial: Partial<BlogPost> & { id?: string };
  onSave: () => void;
  onBack: () => void;
}) => {
  const [form, setForm] = useState({
    title: initial.title ?? "",
    slug: initial.slug ?? "",
    excerpt: initial.excerpt ?? "",
    content: initial.content ?? "",
    featured_image_url: initial.featured_image_url ?? "",
    tags: (initial.tags ?? []).join(", "),
    published: initial.published ?? false,
  });
  const [slugManual, setSlugManual] = useState(Boolean(initial.id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const setF = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const handleTitleChange = (title: string) => {
    setF({ title, ...(!slugManual ? { slug: slugify(title) } : {}) });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${form.slug || "post"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("blog").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("blog").getPublicUrl(path);
      setF({ featured_image_url: data.publicUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    setSaving(true);
    try {
      const tagsArray = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content.trim() || null,
        featured_image_url: form.featured_image_url.trim() || null,
        tags: tagsArray,
        published: form.published,
        published_at:
          form.published && !initial.published_at
            ? new Date().toISOString()
            : initial.published_at ?? null,
      };

      if (initial.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
      toast.success("Post saved");
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-display tracking-widest text-xs">ALL POSTS</span>
        </button>
        {initial.slug && (
          <a
            href={`/blog/${initial.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-[#fde047] transition-colors"
          >
            View Post <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div>
        <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
          {initial.id ? "Editing post" : "New post"}
        </p>
        <h2 className="font-display text-2xl tracking-widest mt-0.5">
          {initial.id ? "EDIT POST" : "NEW POST"}
        </h2>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter post title"
            className="font-display tracking-wider"
          />
        </div>

        {/* Slug */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Slug *</Label>
          <Input
            value={form.slug}
            onChange={(e) => { setSlugManual(true); setF({ slug: slugify(e.target.value) }); }}
            placeholder="post-url-slug"
            className="font-mono text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">pournogravy.com/blog/{form.slug || "…"}</p>
        </div>

        {/* Excerpt */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Excerpt</Label>
          <textarea
            value={form.excerpt}
            onChange={(e) => setF({ excerpt: e.target.value })}
            rows={2}
            placeholder="Short summary shown in the blog list"
            className="w-full text-sm bg-transparent border border-border px-3 py-2 focus:outline-none focus:border-[#fde047] resize-y rounded-md"
          />
        </div>

        {/* Featured image */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Featured Image</Label>
          <div className="space-y-2">
            {form.featured_image_url && (
              <img src={form.featured_image_url} alt="" className="w-full h-40 object-cover border border-border" />
            )}
            <Input
              value={form.featured_image_url}
              onChange={(e) => setF({ featured_image_url: e.target.value })}
              placeholder="Paste image URL, or upload below"
              className="text-sm"
            />
            <label
              className={`cursor-pointer block border border-dashed border-border p-3 text-center text-xs text-muted-foreground hover:border-[#fde047] transition-colors rounded-md ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              {uploading
                ? <Loader2 className="h-4 w-4 mx-auto mb-1 animate-spin" />
                : <Upload className="h-4 w-4 mx-auto mb-1" />}
              {uploading ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Content */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Content</Label>
          <textarea
            value={form.content}
            onChange={(e) => setF({ content: e.target.value })}
            rows={14}
            placeholder="Write your post here.&#10;&#10;Double line break = new paragraph."
            className="w-full text-sm bg-transparent border border-border px-3 py-2 focus:outline-none focus:border-[#fde047] resize-y rounded-md leading-relaxed"
          />
        </div>

        {/* Tags */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Tags</Label>
          <Input
            value={form.tags}
            onChange={(e) => setF({ tags: e.target.value })}
            placeholder="bartending, opinion, rant"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Comma-separated</p>
        </div>

        {/* Published */}
        <div className="flex items-center gap-3 border border-border p-4 rounded-md">
          <Switch
            id="published"
            checked={form.published}
            onCheckedChange={(v) => setF({ published: v })}
          />
          <div>
            <Label htmlFor="published" className="text-sm font-display tracking-wider cursor-pointer">
              {form.published ? "PUBLISHED" : "DRAFT"}
            </Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {form.published ? "Visible to the public" : "Hidden from public"}
            </p>
          </div>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fbbf24] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {saving ? "SAVING…" : "SAVE POST"}
        </Button>
      </div>
    </div>
  );
};

// ─── List ─────────────────────────────────────────────────────────────────────

const BlogAdmin = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<BlogPost> & { id?: string } | null>(null);

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, tags, published, published_at, created_at, featured_image_url, content")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });

  const handleToggle = async (post: BlogPost) => {
    const newPublished = !post.published;
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: newPublished,
        published_at: newPublished && !post.published_at ? new Date().toISOString() : post.published_at,
      })
      .eq("id", post.id);
    if (error) toast.error(error.message);
    else {
      toast.success(newPublished ? "Post published" : "Post set to draft");
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    }
  };

  if (editing !== null) {
    return (
      <PostEditor
        initial={editing}
        onBack={() => setEditing(null)}
        onSave={() => {
          qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">The Shift Log</p>
          <h2 className="font-display text-2xl tracking-widest">BLOG POSTS</h2>
        </div>
        <Button
          onClick={() => setEditing(defaultForm())}
          className="h-9 font-display text-xs tracking-widest bg-[#fde047] text-black hover:bg-[#fbbf24]"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> NEW POST
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border border-border bg-card animate-pulse rounded-sm" />
          ))}
        </div>
      ) : !posts?.length ? (
        <div className="border border-border bg-card p-12 text-center">
          <p className="font-marker text-sm text-muted-foreground italic">No posts yet. Hit NEW POST to write something.</p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          <AnimatePresence>
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm tracking-wider truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-marker tracking-widest uppercase ${
                        post.published ? "text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      {post.published ? "● LIVE" : "○ DRAFT"}
                    </span>
                    {post.published_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                    {post.tags?.length > 0 && (
                      <span className="text-[10px] text-muted-foreground truncate hidden sm:block">
                        {post.tags.slice(0, 2).join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(post)}
                    title={post.published ? "Set to draft" : "Publish"}
                    className={`p-1.5 rounded transition-colors ${post.published ? "text-green-400 hover:text-muted-foreground" : "text-muted-foreground hover:text-green-400"}`}
                  >
                    {post.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  {post.published && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-muted-foreground hover:text-[#fde047] transition-colors"
                      title="View live post"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setEditing(post)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit post"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    className="p-1.5 text-muted-foreground hover:text-[#ff1744] transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default BlogAdmin;
