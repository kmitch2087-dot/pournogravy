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
  value_type: "text" | "color" | "image" | "boolean" | "font" | "select";
  options: string[] | null;
  default_value: string | null;
  sort_order: number;
  is_published: boolean;
}

interface SiteContentCtx {
  rows: SiteContentRow[];
  getValue: (page: string, section: string, key: string, fallback?: string) => string;
  getPublished: (page: string, section: string) => boolean;
  setValue: (page: string, section: string, key: string, value: string) => Promise<void>;
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
    async (page: string, section: string, key: string, value: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.page === page && r.section === section && r.key === key ? { ...r, value } : r
        )
      );
      const { error } = await supabase
        .from("site_content")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("page", page)
        .eq("section", section)
        .eq("key", key);
      if (error) throw new Error(error.message);
    },
    []
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
