import { useState } from "react";
import { useSiteContent } from "@/context/SiteContentContext";
import { SectionGroup } from "@/components/admin/SiteEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGES = ["home", "shop", "about", "contact", "faq"] as const;
type PageKey = (typeof PAGES)[number];

const PAGE_LABELS: Record<PageKey, string> = {
  home:    "Home",
  shop:    "Shop",
  about:   "About",
  contact: "Contact",
  faq:     "FAQ",
};

const Content = () => {
  const { rows } = useSiteContent();
  const [activePage, setActivePage] = useState<PageKey>("home");

  const pageRows = rows.filter((r) => r.page === activePage);
  const sections = [...new Set(pageRows.map((r) => r.section))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-widest">Site Content</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Edit copy across all public pages. Changes go live immediately.
        </p>
      </div>

      <Tabs value={activePage} onValueChange={(v) => setActivePage(v as PageKey)}>
        <TabsList className="mb-6">
          {PAGES.map((p) => (
            <TabsTrigger key={p} value={p} className="font-display tracking-widest text-xs uppercase">
              {PAGE_LABELS[p]}
            </TabsTrigger>
          ))}
        </TabsList>

        {PAGES.map((p) => (
          <TabsContent key={p} value={p} className="space-y-4">
            {p === activePage && sections.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No content rows seeded yet for this page. Run the migration in Supabase.
              </p>
            )}
            {p === activePage &&
              sections.map((section) => (
                <SectionGroup
                  key={section}
                  page={p}
                  section={section}
                  rows={pageRows.filter((r) => r.section === section)}
                />
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Content;
