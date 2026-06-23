import { useState, useRef, useEffect, useCallback } from "react";
import { useSiteContent, SiteContentRow } from "@/context/SiteContentContext";
import { FieldInput } from "@/components/admin/SiteEditor";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

// ─── Pages ────────────────────────────────────────────────────────────────────
const PAGES = ["home", "shop", "about", "contact", "faq"] as const;
type PageKey = (typeof PAGES)[number];

const PAGE_LABELS: Record<PageKey, string> = {
  home: "Home", shop: "Shop", about: "About", contact: "Contact", faq: "FAQ",
};
const PAGE_URLS: Record<PageKey, string> = {
  home: "/", shop: "/shop", about: "/about", contact: "/contact", faq: "/faq",
};

// ─── Field hints (static) ─────────────────────────────────────────────────────
// Key format: "page|section|fieldKey"
const FIELD_HINTS: Record<string, string> = {
  // home > hero
  "home|hero|cta_text":              "The button text on the left side of the homepage hero",
  "home|hero|heading":               "The large text block in the top-left of the homepage hero",
  "home|hero|subheading":            "Smaller tagline below the main heading",
  // home > quotes
  "home|quotes|label":               "Small eyebrow text above the rotating quote carousel",
  "home|quotes|attribution":         "The attribution line beneath each quote (e.g. — Every Bartender Ever)",
  "home|quotes|q_1":                 "1st rotating quote in the carousel",
  "home|quotes|q_2":                 "2nd rotating quote",
  "home|quotes|q_3":                 "3rd rotating quote",
  "home|quotes|q_4":                 "4th rotating quote",
  "home|quotes|q_5":                 "5th rotating quote — leave blank to skip",
  "home|quotes|q_6":                 "6th rotating quote — leave blank to skip",
  // home > featured
  "home|featured|label":             "Small eyebrow text above the featured products row",
  "home|featured|heading":           "Large heading for the featured products section",
  "home|featured|subheading":        "Tagline below the featured heading",
  "home|featured|link_text":         "Text link to the full shop (desktop)",
  "home|featured|button":            "Button linking to the full shop (mobile)",
  // home > superpowers
  "home|superpowers|label":          "Heading above the product superpowers list",
  "home|superpowers|item_1":         "First bullet in the superpowers list",
  "home|superpowers|item_2":         "Second bullet",
  "home|superpowers|item_3":         "Third bullet",
  "home|superpowers|item_4":         "Fourth bullet",
  "home|superpowers|item_5":         "Fifth bullet",
  // home > extras
  "home|extras|heading":             "Heading for the 'But wait, there's more' section",
  "home|extras|label":               "Sub-label above the extras list",
  "home|extras|item_1":              "First bullet in the extras list",
  "home|extras|item_2":              "Second bullet",
  "home|extras|item_3":              "Third bullet",
  "home|extras|item_4":              "Fourth bullet",
  // home > manifesto
  "home|manifesto|text":             "The brand statement block below the product features section",
  // home > cta
  "home|cta|primary_button":         "Main call-to-action button text (links to shop)",
  "home|cta|secondary_button":       "Secondary button text (links to About page)",
  // home > newsletter
  "home|newsletter|heading":         "Heading of the email sign-up section",
  "home|newsletter|subheading":      "Tagline below the newsletter heading",
  "home|newsletter|disclaimer":      "Small disclaimer text below the email input",
  "home|newsletter|success":         "Message shown after someone subscribes",
  // shop > header
  "shop|header|heading":             "The large 'SHOP' heading at the top of the shop page",
  "shop|header|subheading":          "Tagline below the shop heading",
  // about > hero
  "about|hero|label":                "Small eyebrow label above the About page heading",
  "about|hero|heading":              "The main heading on the About page",
  // about > pullquote
  "about|pullquote|text":            "The pull-quote shown mid-page on About",
  // about > manifesto
  "about|manifesto|label":           "Small label above the manifesto quote block",
  "about|manifesto|text":            "The brand manifesto quote",
  // about > cta
  "about|cta|button":                "Button text in the About page CTA",
  // contact > hero / header
  "contact|hero|label":              "Small eyebrow label on the Contact page",
  "contact|hero|subheading":         "Tagline below the Contact heading",
  "contact|header|heading":          "Main heading on the Contact page",
  // contact > sidebar
  "contact|sidebar|email":           "Contact email shown in the sidebar panel",
  "contact|sidebar|response_time":   "Response time text (e.g. 24–48 hrs on weekdays)",
  "contact|sidebar|response_note":   "Small note about weekend availability",
  // faq > hero / header
  "faq|hero|label":                  "Small eyebrow label on the FAQ page",
  "faq|hero|subheading":             "Tagline below the FAQ heading",
  "faq|header|heading":              "Main heading on the FAQ page",
  // faq > items
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
}: {
  row: SiteContentRow;
  page: string;
  section: string;
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
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setStatus(null), 2000);
      } catch {
        toast.error(`Failed to save "${row.label}"`);
        setStatus(null);
      }
    },
    [page, section, row.key, row.label, setValue, setPublished]
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
        <div className="min-w-0">
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase leading-tight">
            {row.label}
          </p>
          {hint && (
            <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-snug">{hint}</p>
          )}
        </div>
        <div
          className="shrink-0 text-[9px] mt-0.5 transition-opacity duration-200"
          style={{ opacity: status ? 1 : 0, minWidth: "50px", textAlign: "right" }}
        >
          {status === "saving" && <span className="text-muted-foreground">Saving…</span>}
          {status === "saved"  && <span className="text-green-400 font-medium">✓ Saved</span>}
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

// ─── Main Content page ────────────────────────────────────────────────────────

const Content = () => {
  const { rows } = useSiteContent();
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const pageRows  = rows.filter((r) => r.page === activePage);
  const sections  = [...new Set(pageRows.map((r) => r.section))];

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

        {/* Section list */}
        <div className="p-3 flex-1 overflow-y-auto">
          <p className="text-[9px] font-marker tracking-[0.3em] text-muted-foreground uppercase mb-2 px-2">
            Sections
          </p>
          {sections.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 px-3 py-2">
              No sections seeded yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {sections.map((section) => {
                const preview = getSectionPreview(section);
                const isActive = activeSection === section;
                return (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`w-full text-left px-3 py-2 transition-colors rounded-none border-l-2 ${
                      isActive
                        ? "bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent"
                    }`}
                  >
                    <p className="text-[10px] font-display tracking-widest uppercase leading-tight">
                      {section}
                    </p>
                    {preview && (
                      <p className={`text-[9px] mt-0.5 leading-tight truncate ${isActive ? "text-[#a3e635]/60" : "text-muted-foreground/50"}`}>
                        {preview}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display tracking-widest text-base">
              {PAGE_LABELS[activePage].toUpperCase()}
              {activeSection && (
                <span className="text-muted-foreground font-normal"> — {activeSection.toUpperCase()}</span>
              )}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Changes go live immediately · Blur any field to save
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

        {/* Fields */}
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
            sectionRows.map((row) => (
              <InlineField
                key={row.id}
                row={row}
                page={activePage}
                section={activeSection}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Content;
