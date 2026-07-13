import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSiteContent, SiteContentRow } from "@/context/SiteContentContext";
import { FieldInput } from "@/components/admin/SiteEditor";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink, Plus, Trash2, GripVertical, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Pages ────────────────────────────────────────────────────────────────────
const PAGES = ["home", "shop", "about", "contact", "faq", "advertise", "global"] as const;
type PageKey = (typeof PAGES)[number];

const PAGE_LABELS: Record<PageKey, string> = {
  home: "Home", shop: "Shop", about: "About", contact: "Contact", faq: "FAQ", advertise: "Advertise With Us", global: "Global",
};
const PAGE_URLS: Record<PageKey, string> = {
  home: "/", shop: "/shop", about: "/about", contact: "/contact", faq: "/faq", advertise: "/advertise", global: "/",
};

// ─── Original seeded superpowers keys — no delete button on these ─────────────
const ORIGINAL_SUPERPOWER_KEYS = new Set(["label", "item_1", "item_2", "item_3"]);

// ─── Structural sections — no delete button on these ─────────────────────────
const STRUCTURAL_SECTIONS: Record<string, Set<string>> = {
  home:    new Set(["hero", "marquee", "announcement", "quotes", "featured", "superpowers", "extras", "manifesto", "cta", "newsletter", "reviews"]),
  shop:    new Set(["header", "cart", "checkout"]),
  about:   new Set(["hero", "pullquote", "manifesto", "cta", "body"]),
  contact: new Set(["hero", "header", "sidebar"]),
  faq:       new Set(["hero", "header", "items", "cta"]),
  advertise: new Set(["hero", "audience", "placements", "contact"]),
  global:    new Set(["footer"]),
};

// ─── Field hints (static) ─────────────────────────────────────────────────────
const FIELD_HINTS: Record<string, string> = {
  "home|hero|cta_text":              "The button text on the left side of the homepage hero",
  "home|hero|heading":               "The large text block in the top-left of the homepage hero",
  "home|hero|subheading":            "Smaller tagline below the main heading",
  "home|quotes|label":               "Small eyebrow text above the rotating quote carousel",
  "home|quotes|attribution":         "The attribution line beneath each quote (e.g. — Every Bartender Ever)",
  "home|quotes|q_1":                 "1st rotating quote in the carousel",
  "home|quotes|q_2":                 "2nd rotating quote",
  "home|quotes|q_3":                 "3rd rotating quote",
  "home|quotes|q_4":                 "4th rotating quote",
  "home|quotes|q_5":                 "5th rotating quote — leave blank to skip",
  "home|quotes|q_6":                 "6th rotating quote — leave blank to skip",
  "home|featured|label":             "Small eyebrow text above the featured products row",
  "home|featured|heading":           "Large heading for the featured products section",
  "home|featured|subheading":        "Tagline below the featured heading",
  "home|featured|link_text":         "Text link to the full shop (desktop)",
  "home|featured|button":            "Button linking to the full shop (mobile)",
  "home|superpowers|label":          "Heading above the product superpowers list",
  "home|superpowers|item_1":         "First bullet in the superpowers list",
  "home|superpowers|item_2":         "Second bullet",
  "home|superpowers|item_3":         "Third bullet",
  "home|superpowers|item_4":         "Fourth bullet",
  "home|superpowers|item_5":         "Fifth bullet",
  "home|extras|heading":             "Heading for the 'But wait, there's more' section",
  "home|extras|label":               "Sub-label above the extras list",
  "home|extras|item_1":              "First bullet in the extras list",
  "home|extras|item_2":              "Second bullet",
  "home|extras|item_3":              "Third bullet",
  "home|extras|item_4":              "Fourth bullet",
  "home|manifesto|text":             "The brand statement block below the product features section",
  "home|cta|primary_button":         "Main call-to-action button text (links to shop)",
  "home|cta|secondary_button":       "Secondary button text (links to About page)",
  "home|newsletter|heading":         "Heading of the email sign-up section",
  "home|newsletter|subheading":      "Tagline below the newsletter heading",
  "home|newsletter|disclaimer":      "Small disclaimer text below the email input",
  "home|newsletter|success":         "Message shown after someone subscribes",
  "shop|header|heading":             "The large 'SHOP' heading at the top of the shop page",
  "shop|header|subheading":          "Tagline below the shop heading",
  "about|hero|label":                "Small eyebrow label above the About page heading",
  "about|hero|heading":              "The main heading on the About page",
  "about|pullquote|text":            "The pull-quote shown mid-page on About",
  "about|manifesto|label":           "Small label above the manifesto quote block",
  "about|manifesto|text":            "The brand manifesto quote",
  "about|cta|button":                "Button text in the About page CTA",
  "contact|hero|label":              "Small eyebrow label on the Contact page",
  "contact|hero|subheading":         "Tagline below the Contact heading",
  "contact|header|heading":          "Main heading on the Contact page",
  "contact|sidebar|email":           "Contact email shown in the sidebar panel",
  "contact|sidebar|response_time":   "Response time text (e.g. 24–48 hrs on weekdays)",
  "contact|sidebar|response_note":   "Small note about weekend availability",
  "faq|hero|label":                  "Small eyebrow label on the FAQ page",
  "faq|hero|subheading":             "Tagline below the FAQ heading",
  "faq|header|heading":              "Main heading on the FAQ page",
  "faq|items|q1_q":  "FAQ question 1 text",
  "faq|items|q1_a":  "Answer to question 1",
  "faq|items|q2_q":  "FAQ question 2 text",
  "faq|items|q2_a":  "Answer to question 2",
  "faq|items|q3_q":  "FAQ question 3 text",
  "faq|items|q3_a":  "Answer to question 3",
  "faq|items|q4_q":  "FAQ question 4 text",
  "faq|items|q4_a":  "Answer to question 4",
  "faq|items|q5_q":  "FAQ question 5 text",
  "faq|items|q5_a":  "Answer to question 5",
  "faq|items|q6_q":  "FAQ question 6 text",
  "faq|items|q6_a":  "Answer to question 6",
  "faq|items|q7_q":  "FAQ question 7 text",
  "faq|items|q7_a":  "Answer to question 7",
  "faq|items|q8_q":  "FAQ question 8 text",
  "faq|items|q8_a":  "Answer to question 8",
  "faq|cta|prompt":    "Bottom prompt text — e.g. 'Didn't answer your question?'",
  "faq|cta|link_text": "Bottom CTA link text linking to the Contact page",
  "about|body|p1": "First body paragraph — brand origin story",
  "about|body|p2": "Second body paragraph — who POURnogravy is for",
  "about|body|p3": "Third body paragraph — origin of the designs",
  "home|reviews|label":   "Small eyebrow label above the customer reviews section",
  "home|reviews|heading": "Heading for the customer reviews section",
  "home|marquee|text":                "The scrolling ticker text across the top of the home page",
  "home|announcement|label":         "Label prefix in the announcement bar (e.g. 'Pre-Shift Bulletin:')",
  "home|hero|cta_button":            "Hero CTA button text — the main shop link in the hero",
  "home|hero|cta_sub":               "Small subtext inside the hero CTA button (e.g. '(Not so much ice.)')",
  "shop|cart|empty_state":           "Text shown when the cart is empty",
  "shop|checkout|shipping_note":     "Small note below the cart total about shipping",
  "shop|checkout|email_prompt":      "Prompt shown when asking for guest email at checkout",
  "shop|checkout|gratuity":          "The italic 'gratuity' line on the cart receipt",
  "global|footer|tagline":           "The tagline at the bottom of every page footer",
};

// ─── Types that save on change (no blur needed) ───────────────────────────────
const IMMEDIATE_TYPES = new Set(["boolean", "color", "select", "font"]);

// Strip HTML tags for preview text
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

// ─── InlineField ──────────────────────────────────────────────────────────────

function InlineField({
  row,
  page,
  section,
  onDelete,
}: {
  row: SiteContentRow;
  page: string;
  section: string;
  onDelete?: () => void;
}) {
  const { setValue, setPublished } = useSiteContent();
  const [localValue, setLocalValue] = useState(row.value ?? row.default_value ?? "");
  const [status, setStatus] = useState<"saving" | "saved" | null>(null);
  const valueRef = useRef(row.value ?? row.default_value ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = row.value ?? row.default_value ?? "";
    setLocalValue(v);
    valueRef.current = v;
  }, [row.value, row.default_value]);

  const persistValue = useCallback(
    async (val: string) => {
      setStatus("saving");
      try {
        if (row.key === "visible") {
          await setPublished(page, section, val === "true");
        } else {
          await setValue(page, section, row.key, val);
        }
        setStatus("saved");
        toast.success("Saved");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setStatus(null), 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to save — ${msg}`);
        setStatus(null);
      }
    },
    [page, section, row.key, setValue, setPublished]
  );

  const handleChange = (val: string) => {
    setLocalValue(val);
    valueRef.current = val;
    if (IMMEDIATE_TYPES.has(row.value_type)) {
      persistValue(val);
    }
  };

  const isImmediate = IMMEDIATE_TYPES.has(row.value_type);
  const hint = FIELD_HINTS[`${page}|${section}|${row.key}`] ?? "";

  return (
    <div className="space-y-1.5 py-4 border-b border-border/50 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase leading-tight">
            {row.label}
          </p>
          {hint && (
            <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-snug">{hint}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="text-[9px] mt-0.5 transition-opacity duration-200"
            style={{ opacity: status ? 1 : 0, minWidth: "50px", textAlign: "right" }}
          >
            {status === "saving" && <span className="text-muted-foreground">Saving…</span>}
            {status === "saved"  && <span className="text-green-400 font-medium">✓ Saved</span>}
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
              title="Delete this item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        onBlur={
          isImmediate
            ? undefined
            : (e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  persistValue(valueRef.current);
                }
              }
        }
      >
        <FieldInput
          row={{ ...row, value: localValue }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

// ─── Add Section Dialog ───────────────────────────────────────────────────────

type SectionType = "text" | "html" | "qa";

function AddSectionDialog({
  open,
  page,
  onClose,
}: {
  open: boolean;
  page: string;
  onClose: () => void;
}) {
  const { setValue, refetch } = useSiteContent();
  const [sectionName, setSectionName] = useState("");
  const [sectionType, setSectionType] = useState<SectionType>("text");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const name = sectionName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) return;
    setSaving(true);
    try {
      if (sectionType === "text") {
        await setValue(page, name, "content", "New content — click to edit");
      } else if (sectionType === "html") {
        await setValue(page, name, "content", "<p>New rich text — click to edit</p>");
      } else if (sectionType === "qa") {
        await setValue(page, name, `${name}_q`, "New question?");
        await setValue(page, name, `${name}_a`, "Answer goes here.");
      }
      toast.success(`Section "${name}" added`);
      refetch();
      setSectionName("");
      setSectionType("text");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to add section — ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogDescription>
            Creates new editable content rows for this page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="section-name">Section name</Label>
            <Input
              id="section-name"
              placeholder="e.g. banner, promo, sidebar_note"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
            <p className="text-[10px] text-muted-foreground">
              Lowercase, underscores only. Will be used as the section key.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-type">Section type</Label>
            <Select value={sectionType} onValueChange={(v) => setSectionType(v as SectionType)}>
              <SelectTrigger id="section-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Block — plain text field</SelectItem>
                <SelectItem value="html">Rich Text — formatted HTML editor</SelectItem>
                <SelectItem value="qa">Q&amp;A Pair — question + answer fields</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !sectionName.trim()}
              className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Section"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shop product thumbnail type ──────────────────────────────────────────────

interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  images: string[];
  display_order: number | null;
  flip_enabled: boolean;
  flip_image_url: string | null;
}

// ─── Sortable product card ────────────────────────────────────────────────────

function SortableProductCard({
  product,
  onClick,
  previewIndex,
}: {
  product: ShopProduct;
  onClick: () => void;
  previewIndex: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const imgSrc = product.image_url ?? (product.images?.[0] ?? null);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group border border-border bg-[#111] hover:border-[#fde047]/40 transition-colors cursor-pointer overflow-hidden"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 p-1 text-white/30 hover:text-white/80 cursor-grab active:cursor-grabbing bg-black/40 rounded-sm"
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      {/* Position badge */}
      <span className="absolute top-1 right-1 z-10 text-[8px] font-mono bg-black/60 text-white/50 px-1 rounded-sm leading-tight">
        #{previewIndex + 1}
      </span>

      {/* Flip badge */}
      {product.flip_enabled && (
        <span className="absolute bottom-7 left-1 z-10 text-[7px] font-display tracking-widest bg-[#fde047] text-black px-1 py-px leading-tight uppercase">
          flip
        </span>
      )}

      <div onClick={onClick} className="aspect-square">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center p-2">
            <span className="text-[8px] text-muted-foreground text-center leading-tight">{product.name}</span>
          </div>
        )}
      </div>

      <div
        onClick={onClick}
        className="px-1.5 py-1 bg-black border-t border-border/40"
      >
        <p className="text-[8px] text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
          {product.name}
        </p>
      </div>
    </div>
  );
}

// ─── Shop Tab ─────────────────────────────────────────────────────────────────

function ShopTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reorderedList, setReorderedList] = useState<ShopProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmProduct, setConfirmProduct] = useState<ShopProduct | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: products = [], isLoading } = useQuery<ShopProduct[]>({
    queryKey: ["content-shop-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, image_url, images, display_order, flip_enabled, flip_image_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ShopProduct[];
    },
  });

  // Mirror the public shop's flip-spacing so the preview matches what customers see
  const previewList = (() => {
    const result = [...reorderedList];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < result.length - 1; i++) {
        if (result[i].flip_enabled && result[i + 1].flip_enabled) {
          let j = i + 2;
          while (j < result.length && result[j].flip_enabled) j++;
          if (j < result.length) {
            const [item] = result.splice(j, 1);
            result.splice(i + 1, 0, item);
            changed = true;
            break;
          }
          break;
        }
      }
    }
    return result;
  })();

  // Sync local list when products load
  useEffect(() => {
    setReorderedList(products);
  }, [products]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = reorderedList.findIndex((p) => p.id === active.id);
    const newIndex = reorderedList.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setReorderedList((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      // Per-row UPDATE (not upsert): upsert would run an INSERT that violates the
      // NOT NULL constraints on name/slug/price_cents, so it always failed.
      const results = await Promise.all(
        reorderedList.map((p, i) =>
          supabase.from("products").update({ display_order: i }).eq("id", p.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      toast.success("Shop order saved!");
      qc.invalidateQueries({ queryKey: ["content-shop-products"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to save order — ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = (product: ShopProduct) => {
    navigate(`/admin/products/${product.id}`);
  };

  return (
    <div className="px-6 py-4 space-y-4 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            Drag to set your preferred order. The preview below mirrors the public shop exactly — including automatic spacing of flip cards.
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            Yellow <span className="text-[#fde047]">flip</span> badges = card animation enabled · Position numbers show where each product lands
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSaveOrder}
          disabled={saving || isLoading}
          className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest shrink-0"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Order"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reorderedList.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No active products found.
        </p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={reorderedList.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            {/* 3-column grid — matches public shop md:grid-cols-3 breakpoint */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previewList.map((product, idx) => (
                <SortableProductCard
                  key={product.id}
                  product={product}
                  previewIndex={idx}
                  onClick={() => setConfirmProduct(product)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit confirmation dialog */}
      <AlertDialog open={!!confirmProduct} onOpenChange={(o) => { if (!o) setConfirmProduct(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit this product?</AlertDialogTitle>
            <AlertDialogDescription>
              Navigate to the product editor for{" "}
              <strong>{confirmProduct?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmProduct) handleEditProduct(confirmProduct);
                setConfirmProduct(null);
              }}
              className="bg-[#fde047] text-black hover:bg-[#fde047]/90"
            >
              Edit Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Content page ────────────────────────────────────────────────────────

const Content = () => {
  const { rows, setValue, refetch } = useSiteContent();
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addingPower, setAddingPower] = useState(false);
  const [addingFooterNote, setAddingFooterNote] = useState(false);
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<{ section: string; key: string } | null>(null);

  const pageRows  = rows.filter((r) => r.page === activePage);
  // For shop page, inject a "__layout__" pseudo-section at the top for drag-reorder
  const sections  = activePage === "shop"
    ? ["__layout__", ...new Set(pageRows.map((r) => r.section))]
    : [...new Set(pageRows.map((r) => r.section))];

  // Auto-select first section when page changes
  useEffect(() => {
    setActiveSection(sections[0] ?? null);
  }, [activePage]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionRows = activeSection
    ? pageRows.filter((r) => r.section === activeSection)
    : [];

  // One-line preview for a section: first non-visible text value, stripped of HTML
  const getSectionPreview = (section: string): string => {
    const textRow = pageRows.find(
      (r) => r.section === section && r.key !== "visible" && r.value_type === "text"
    );
    if (!textRow) return "";
    const raw = textRow.value ?? textRow.default_value ?? "";
    const stripped = stripHtml(raw);
    return stripped.length > 44 ? stripped.slice(0, 44) + "…" : stripped;
  };

  // Is this section structural (no delete)?
  const isSectionStructural = (section: string): boolean => {
    return STRUCTURAL_SECTIONS[activePage]?.has(section) ?? false;
  };

  // Add a new superpower item (uses sp_N keys; item_N are the original seeded keys)
  const handleAddSuperpower = async () => {
    const powerRows = rows.filter(
      (r) => r.page === "home" && r.section === "superpowers" && r.key.startsWith("sp_")
    );
    const nums = powerRows
      .map((r) => parseInt(r.key.replace("sp_", ""), 10))
      .filter((n) => !isNaN(n));
    const nextN = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setAddingPower(true);
    try {
      const { error } = await supabase.from("site_content").insert({
        page: "home",
        section: "superpowers",
        key: `sp_${nextN}`,
        label: `Superpower ${nextN}`,
        value: "New superpower — click to edit",
        default_value: "New superpower — click to edit",
        value_type: "text",
        sort_order: 100 + nextN,
      });
      if (error) throw error;
      refetch();
      toast.success("Superpower added");
      // Switch to superpowers section
      setActivePage("home");
      setActiveSection("superpowers");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to add — ${msg}`);
    } finally {
      setAddingPower(false);
    }
  };

  // Add a new footer note (cart_variants)
  const handleAddFooterNote = async () => {
    const noteRows = rows.filter(
      (r) => r.page === "shop" && r.section === "cart_variants" && r.key.startsWith("v_")
    );
    const nums = noteRows
      .map((r) => parseInt(r.key.replace("v_", ""), 10))
      .filter((n) => !isNaN(n));
    const nextN = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setAddingFooterNote(true);
    try {
      const { error } = await supabase.from("site_content").insert({
        page: "shop",
        section: "cart_variants",
        key: `v_${nextN}`,
        label: `Footer note ${nextN}`,
        value: "New footer note — click to edit",
        default_value: "New footer note — click to edit",
        value_type: "text",
        sort_order: nextN,
      });
      if (error) throw error;
      refetch();
      toast.success("Footer note added");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to add — ${msg}`);
    } finally {
      setAddingFooterNote(false);
    }
  };

  // Delete a content row (superpower item or dynamic section)
  const handleDeleteRow = async (section: string, key: string) => {
    try {
      const { error } = await supabase
        .from("site_content")
        .delete()
        .match({ page: activePage, section, key });
      if (error) throw error;
      refetch();
      toast.success("Deleted");
      setDeletingKey(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete — ${msg}`);
    }
  };

  // Delete an entire section (all rows for that section/page)
  const handleDeleteSection = async (section: string) => {
    try {
      const { error } = await supabase
        .from("site_content")
        .delete()
        .match({ page: activePage, section });
      if (error) throw error;
      refetch();
      toast.success(`Section "${section}" deleted`);
      setDeletingSection(null);
      setActiveSection(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete section — ${msg}`);
    }
  };

  // Shop page has a special layout section, but also has content sections.
  // We show ShopTab only when "layout" pseudo-section is active.
  const isShopLayoutSection = activePage === "shop" && activeSection === "__layout__";

  return (
    <div
      className="flex -mx-4 md:-mx-6 -mt-4 md:-mt-6 -mb-4 md:-mb-6"
      style={{ minHeight: "calc(100vh - 3.5rem)" }}
    >
      {/* ── Sidebar ── */}
      <aside className="w-44 md:w-52 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Page list */}
        <div className="p-3 border-b border-border/60">
          <p className="text-[9px] font-marker tracking-[0.3em] text-muted-foreground uppercase mb-2 px-2">
            Pages
          </p>
          <div className="space-y-0.5">
            {PAGES.map((page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`w-full text-left px-3 py-2 text-xs font-display tracking-widest transition-colors rounded-none ${
                  activePage === page
                    ? "bg-[#a3e635]/10 text-[#a3e635] border-l-2 border-[#a3e635]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-l-2 border-transparent"
                }`}
              >
                {PAGE_LABELS[page].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Section list — always visible; shop includes a __layout__ pseudo-section */}
        {(
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
            <p className="text-[9px] font-marker tracking-[0.3em] text-muted-foreground uppercase mb-2 px-2">
              Sections
            </p>
            {sections.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/50 px-3 py-2">
                No sections seeded yet.
              </p>
            ) : (
              <div className="space-y-0.5 flex-1">
                {sections.map((section) => {
                  const isLayout = section === "__layout__";
                  const preview = isLayout ? "Product drag-to-reorder" : getSectionPreview(section);
                  const isActive = activeSection === section;
                  const isStructural = isLayout || isSectionStructural(section);
                  const displayLabel = isLayout ? "LAYOUT" : section;
                  return (
                    <div key={section} className="relative group/sec">
                      <button
                        onClick={() => setActiveSection(section)}
                        className={`w-full text-left px-3 py-2 transition-colors rounded-none border-l-2 pr-7 ${
                          isActive
                            ? "bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent"
                        }`}
                      >
                        <p className="text-[10px] font-display tracking-widest uppercase leading-tight">
                          {displayLabel}
                        </p>
                        {preview && (
                          <p className={`text-[9px] mt-0.5 leading-tight truncate ${isActive ? "text-[#a3e635]/60" : "text-muted-foreground/50"}`}>
                            {preview}
                          </p>
                        )}
                      </button>
                      {!isStructural && (
                        <button
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover/sec:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                          title="Delete section"
                          onClick={(e) => { e.stopPropagation(); setDeletingSection(section); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Add Section button */}
            {["home", "about", "faq"].includes(activePage) && (
              <button
                onClick={() => setAddSectionOpen(true)}
                className="mt-1 w-full flex items-center gap-1.5 px-3 py-2 text-[10px] text-muted-foreground/60 hover:text-[#fde047] hover:bg-muted/20 transition-colors border border-dashed border-border/40 hover:border-[#fde047]/40"
              >
                <Plus className="h-3 w-3" /> Add Section
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display tracking-widest text-base">
              {PAGE_LABELS[activePage].toUpperCase()}
              {activeSection && activeSection !== "__layout__" && (
                <span className="text-muted-foreground font-normal"> — {activeSection.toUpperCase()}</span>
              )}
              {isShopLayoutSection && (
                <span className="text-muted-foreground font-normal"> — LAYOUT</span>
              )}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isShopLayoutSection
                ? "Drag products to arrange shop display order"
                : "Changes go live immediately · Blur any field to save"}
            </p>
          </div>
          <a
            href={PAGE_URLS[activePage]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#fde047] transition-colors"
          >
            View page <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Shop layout section: drag-to-reorder product grid */}
        {isShopLayoutSection ? (
          <ShopTab />
        ) : (
          /* Fields */
          <div className="px-6 py-2 max-w-2xl w-full">
            {!activeSection ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Select a section from the sidebar.
              </p>
            ) : sectionRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                No content rows seeded for this section yet.
              </p>
            ) : (
              <>
                {sectionRows.map((row) => {
                  // Determine if this row can be deleted
                  const canDelete =
                    activeSection === "superpowers" && activePage === "home"
                      ? !ORIGINAL_SUPERPOWER_KEYS.has(row.key)
                      : activeSection === "cart_variants" && activePage === "shop"
                        ? true  // all cart_variant rows are deletable
                        : !isSectionStructural(activeSection);

                  return (
                    <InlineField
                      key={row.id}
                      row={row}
                      page={activePage}
                      section={activeSection}
                      onDelete={
                        canDelete
                          ? () => setDeletingKey({ section: activeSection, key: row.key })
                          : undefined
                      }
                    />
                  );
                })}

                {/* Add Superpower button — only on home > superpowers */}
                {activePage === "home" && activeSection === "superpowers" && (
                  <div className="pt-4 pb-2">
                    <button
                      onClick={handleAddSuperpower}
                      disabled={addingPower}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display tracking-widest text-muted-foreground hover:text-[#fde047] border border-dashed border-border/40 hover:border-[#fde047]/40 transition-colors disabled:opacity-50"
                    >
                      {addingPower
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Plus className="h-3.5 w-3.5" />}
                      ADD SUPERPOWER
                    </button>
                  </div>
                )}

                {/* Add Footer Note button — only on shop > cart_variants */}
                {activePage === "shop" && activeSection === "cart_variants" && (
                  <div className="pt-4 pb-2">
                    <button
                      onClick={handleAddFooterNote}
                      disabled={addingFooterNote}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display tracking-widest text-muted-foreground hover:text-[#fde047] border border-dashed border-border/40 hover:border-[#fde047]/40 transition-colors disabled:opacity-50"
                    >
                      {addingFooterNote
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Plus className="h-3.5 w-3.5" />}
                      ADD FOOTER NOTE
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Section dialog */}
      <AddSectionDialog
        open={addSectionOpen}
        page={activePage}
        onClose={() => setAddSectionOpen(false)}
      />

      {/* Confirm delete single row */}
      <AlertDialog
        open={!!deletingKey}
        onOpenChange={(o) => { if (!o) setDeletingKey(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the "{deletingKey?.key}" row from the database. The
              change goes live immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingKey) handleDeleteRow(deletingKey.section, deletingKey.key);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete entire section */}
      <AlertDialog
        open={!!deletingSection}
        onOpenChange={(o) => { if (!o) setDeletingSection(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section "{deletingSection}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes all content rows for this section. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingSection) handleDeleteSection(deletingSection);
              }}
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Content;
