import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteContentRow {
  id: string;
  page: string;
  section: string;
  key: string;
  label: string;
  value: string | null;
  value_type: "text" | "color" | "image" | "boolean" | "font" | "select" | "html";
  options: string[] | null;
  default_value: string | null;
  sort_order: number;
  is_published: boolean;
}

interface SiteContentCtx {
  rows: SiteContentRow[];
  getValue: (page: string, section: string, key: string, fallback?: string) => string;
  getPublished: (page: string, section: string) => boolean;
  setValue: (page: string, section: string, key: string, value: string, valueType?: SiteContentRow["value_type"]) => Promise<void>;
  setPublished: (page: string, section: string, published: boolean) => Promise<void>;
  refetch: () => void;
  loading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SiteContentContext = createContext<SiteContentCtx>({
  rows: [],
  getValue: (_, __, ___, fallback = "") => fallback,
  getPublished: () => true,
  setValue: async () => {},
  setPublished: async () => {},
  refetch: () => {},
  loading: true,
});

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [rows, setRows]     = useState<SiteContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setRows(data as SiteContentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getValue = useCallback(
    (page: string, section: string, key: string, fallback = ""): string => {
      const row = rows.find((r) => r.page === page && r.section === section && r.key === key);
      return row?.value ?? row?.default_value ?? fallback;
    },
    [rows]
  );

  const getPublished = useCallback(
    (page: string, section: string): boolean => {
      // Look for a visibility key in that section
      const row = rows.find(
        (r) => r.page === page && r.section === section && (r.key === "visible" || r.value_type === "boolean")
      );
      if (!row) return true;
      return row.value === "true" || row.default_value === "true";
    },
    [rows]
  );

  const setValue = useCallback(
    async (page: string, section: string, key: string, value: string, valueType: SiteContentRow["value_type"] = "text") => {
      // Only the value changes on an edit — never clobber the row's existing
      // value_type/label (doing so turns color/boolean/html fields into plain text).
      // valueType only applies when creating a brand-new key (e.g. a rich-text section).
      const existing = rows.find(
        (r) => r.page === page && r.section === section && r.key === key
      );
      setRows((prev) => {
        const exists = prev.some(
          (r) => r.page === page && r.section === section && r.key === key
        );
        if (exists) {
          return prev.map((r) =>
            r.page === page && r.section === section && r.key === key ? { ...r, value } : r
          );
        }
        // Optimistically add a new row so the UI reflects the change immediately
        const newRow: SiteContentRow = {
          id: crypto.randomUUID(),
          page,
          section,
          key,
          label: key,
          value,
          value_type: valueType,
          options: null,
          default_value: null,
          sort_order: 999,
          is_published: true,
        };
        return [...prev, newRow];
      });
      const ts = new Date().toISOString();
      // Existing row → update value only (keeps value_type/label/options intact).
      // New key → insert as a text field.
      const { error } = existing
        ? await supabase
            .from("site_content")
            .update({ value, updated_at: ts })
            .eq("page", page)
            .eq("section", section)
            .eq("key", key)
        : await supabase
            .from("site_content")
            .insert({ page, section, key, label: key, value, value_type: valueType, updated_at: ts });
      if (error) throw new Error(error.message);
    },
    [rows]
  );

  const setPublished = useCallback(
    async (page: string, section: string, published: boolean) => {
      const value = String(published);
      setRows((prev) =>
        prev.map((r) =>
          r.page === page && r.section === section && r.key === "visible" ? { ...r, value } : r
        )
      );
      const { error } = await supabase
        .from("site_content")
        .upsert(
          { page, section, key: "visible", label: "visible", value, updated_at: new Date().toISOString() },
          { onConflict: "page,section,key" }
        );
      if (error) throw new Error(error.message);
    },
    []
  );

  return (
    <SiteContentContext.Provider value={{ rows, getValue, getPublished, setValue, setPublished, refetch: fetchAll, loading }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export const useSiteContent = () => useContext(SiteContentContext);
