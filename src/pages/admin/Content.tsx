import { useState } from "react";
import { useSiteContent } from "@/context/SiteContentContext";
import { SectionGroup } from "@/components/admin/SiteEditor";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PAGES = ["home", "shop", "about", "contact", "faq"] as const;
type PageKey = (typeof PAGES)[number];

const PAGE_LABELS: Record<PageKey, string> = {
  home:    "HOME",
  shop:    "SHOP",
  about:   "ABOUT",
  contact: "CONTACT",
  faq:     "FAQ",
};

const PAGE_URLS: Record<PageKey, string> = {
  home:    "/",
  shop:    "/shop",
  about:   "/about",
  contact: "/contact",
  faq:     "/faq",
};

const PAGE_ICONS: Record<PageKey, string> = {
  home:    "🏠",
  shop:    "🛍️",
  about:   "⚡",
  contact: "✉️",
  faq:     "❓",
};

const tileVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.04, duration: 0.2 } }),
};

const Content = () => {
  const { rows } = useSiteContent();
  const [activePage, setActivePage] = useState<PageKey | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const goBack = () => {
    if (activeSection) { setActiveSection(null); return; }
    setActivePage(null);
  };

  // Level 3: page + section selected — show fields
  if (activePage && activeSection) {
    const sectionRows = rows.filter((r) => r.page === activePage && r.section === activeSection);
    return (
      <div className="space-y-5 max-w-2xl">
        {/* Breadcrumb + back */}
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-display tracking-widest text-xs">BACK</span>
          </button>
          <a
            href={PAGE_URLS[activePage]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#fde047] transition-colors"
          >
            View Page <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div>
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
            {PAGE_LABELS[activePage]} → {activeSection.toUpperCase()}
          </p>
          <h2 className="font-display text-xl tracking-widest mt-1">{activeSection.toUpperCase()}</h2>
        </div>

        <SectionGroup
          page={activePage}
          section={activeSection}
          rows={sectionRows}
        />
      </div>
    );
  }

  // Level 2: page selected — show section tiles
  if (activePage) {
    const pageRows = rows.filter((r) => r.page === activePage);
    const sections = [...new Set(pageRows.map((r) => r.section))];

    return (
      <div className="space-y-6 max-w-3xl">
        {/* Breadcrumb + back */}
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-display tracking-widest text-xs">ALL PAGES</span>
          </button>
          <a
            href={PAGE_URLS[activePage]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#fde047] transition-colors"
          >
            View Page <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div>
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">Editing</p>
          <h2 className="font-display text-2xl tracking-widest">{PAGE_LABELS[activePage]}</h2>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No content rows seeded yet for this page.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AnimatePresence>
              {sections.map((section, i) => {
                const fieldCount = pageRows.filter((r) => r.section === section && r.key !== "visible").length;
                return (
                  <motion.button
                    key={section}
                    custom={i}
                    variants={tileVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => setActiveSection(section)}
                    className="group border border-border bg-card hover:border-[#fde047] hover:bg-[#fde047]/5 transition-all p-5 text-left space-y-2"
                  >
                    <p className="font-display tracking-widest text-sm uppercase group-hover:text-[#fde047] transition-colors">
                      {section}
                    </p>
                    <p className="text-[10px] font-marker text-muted-foreground">
                      {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                    </p>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // Level 1: page selection grid
  const pageCounts = PAGES.reduce<Record<PageKey, number>>((acc, p) => {
    acc[p] = [...new Set(rows.filter((r) => r.page === p).map((r) => r.section))].length;
    return acc;
  }, {} as Record<PageKey, number>);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-2xl tracking-widest">SITE CONTENT</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a page to edit its copy. Changes go live immediately.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AnimatePresence>
          {PAGES.map((page, i) => (
            <motion.button
              key={page}
              custom={i}
              variants={tileVariants}
              initial="hidden"
              animate="visible"
              onClick={() => setActivePage(page)}
              className="group border border-border bg-card hover:border-[#fde047] hover:bg-[#fde047]/5 transition-all p-6 text-left space-y-3"
            >
              <span className="text-2xl">{PAGE_ICONS[page]}</span>
              <div>
                <p className="font-display tracking-widest text-base group-hover:text-[#fde047] transition-colors">
                  {PAGE_LABELS[page]}
                </p>
                <p className="text-[10px] font-marker text-muted-foreground mt-0.5">
                  {pageCounts[page]} section{pageCounts[page] !== 1 ? "s" : ""}
                </p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Content;
