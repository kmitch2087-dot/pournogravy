import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, LogOut } from "lucide-react";

type Item = { folder: string; name: string; path: string; url: string | null };

const SECTIONS: { folder: string; title: string; note: string }[] = [
  { folder: "white", title: "FRONT — WHITE INK", note: "For dark shirts (black, navy, charcoal…)" },
  { folder: "black", title: "FRONT — BLACK INK", note: "For light shirts (white…)" },
  { folder: "back", title: "BACK LOGOS", note: "Auto-matched to garment color on each order" },
];

// Print-file catalog for the printer. Lists every design in the private bucket and
// serves each via a short-lived signed URL (works whether the bucket is public or private).
export default function PrinterCatalog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const grouped: Record<string, Item[]> = {};
        for (const { folder } of SECTIONS) {
          const { data: files, error } = await supabase.storage
            .from("print-files")
            .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
          if (error) throw error;
          const pngs = (files ?? []).filter((f) => f.name.toLowerCase().endsWith(".png"));
          const paths = pngs.map((f) => `${folder}/${f.name}`);
          const { data: signed } = await supabase.storage
            .from("print-files")
            .createSignedUrls(paths, 3600);
          const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
          grouped[folder] = pngs.map((f) => ({
            folder,
            name: f.name,
            path: `${folder}/${f.name}`,
            url: urlByPath.get(`${folder}/${f.name}`) ?? null,
          }));
        }
        if (active) setItems(grouped);
      } catch (e) {
        if (active) setErr(e instanceof Error ? e.message : "Could not load files");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/printer/login", { replace: true });
  };

  const download = async (path: string, name: string) => {
    const { data } = await supabase.storage.from("print-files").createSignedUrl(path, 60, {
      download: name,
    });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-black/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <h1 className="font-display tracking-widest text-[#fde047]">PRINT-FILE CATALOG</h1>
          <button
            onClick={signOut}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 text-xs text-muted-foreground bg-zinc-900 border border-border rounded p-4 leading-relaxed">
          <span className="text-foreground font-semibold">Backup catalog.</span> Your primary source for
          each job is the print-file links in the order email. Files here are white-ink art (renders on a
          dark tile below) and black-ink art. Trouble?{" "}
          <a href="mailto:kristinmitchell@aethyx.space" className="text-[#fde047]">
            kristinmitchell@aethyx.space
          </a>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
          </div>
        )}
        {err && <p className="text-red-400 text-sm py-10 text-center">{err}</p>}

        {!loading &&
          !err &&
          SECTIONS.map(({ folder, title, note }) => {
            const list = items[folder] ?? [];
            return (
              <section key={folder} className="mb-10">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="font-display tracking-widest text-sm">{title}</h2>
                  <span className="text-xs text-muted-foreground">{note}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{list.length} files</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {list.map((it) => (
                    <div key={it.path} className="border border-border rounded overflow-hidden bg-card">
                      <div className="aspect-square bg-zinc-900 flex items-center justify-center p-3">
                        {it.url ? (
                          <img
                            src={it.url}
                            alt={it.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">no preview</span>
                        )}
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <span className="text-[11px] font-mono truncate flex-1" title={it.name}>
                          {it.name}
                        </span>
                        <button
                          onClick={() => download(it.path, it.name)}
                          className="text-[#fde047] hover:text-[#fde047]/80 shrink-0"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
