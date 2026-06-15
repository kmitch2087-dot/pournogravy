import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileImage, Lock, Eye, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { products } from "@/data/products";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccessLogRow {
  id: string;
  email: string;
  file_path: string;
  accessed_at: string;
}

interface Credentials {
  email: string;
  password: string;
}

// ─── Helper: call get-print-file edge function ────────────────────────────────

async function fetchSignedUrl(creds: Credentials, filePath: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-print-file", {
    body: { email: creds.email, password: creds.password, file_path: filePath },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.signed_url as string;
}

// ─── Product Card ─────────────────────────────────────────────────────────────

const PrintFileCard = ({
  slug,
  name,
  creds,
}: {
  slug: string;
  name: string;
  creds: Credentials;
}) => {
  const [blackUrl, setBlackUrl] = useState<string | null>(null);
  const [whiteUrl, setWhiteUrl] = useState<string | null>(null);
  const [loadingBlack, setLoadingBlack] = useState(true);
  const [loadingWhite, setLoadingWhite] = useState(true);
  const [errorBlack, setErrorBlack] = useState(false);
  const [errorWhite, setErrorWhite] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Fetch black variant
    fetchSignedUrl(creds, `black/${slug}_black.png`)
      .then((url) => { if (!cancelled) { setBlackUrl(url); setLoadingBlack(false); } })
      .catch(() => { if (!cancelled) { setErrorBlack(true); setLoadingBlack(false); } });

    // Fetch white variant
    fetchSignedUrl(creds, `white/${slug}_white.png`)
      .then((url) => { if (!cancelled) { setWhiteUrl(url); setLoadingWhite(false); } })
      .catch(() => { if (!cancelled) { setErrorWhite(true); setLoadingWhite(false); } });

    return () => { cancelled = true; };
  }, [slug, creds]);

  const ImageSlot = ({
    url,
    loading,
    hasError,
    label,
    bg,
  }: {
    url: string | null;
    loading: boolean;
    hasError: boolean;
    label: string;
    bg: string;
  }) => (
    <div className={`flex flex-col items-center gap-2 flex-1 rounded p-2 ${bg}`}>
      <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">{label}</p>
      <div className="w-full aspect-square flex items-center justify-center overflow-hidden rounded">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : hasError || !url ? (
          <div className="flex flex-col items-center gap-1 opacity-40">
            <Image className="h-6 w-6 text-muted-foreground" />
            <p className="text-[9px] text-muted-foreground">Not found</p>
          </div>
        ) : (
          <img
            src={url}
            alt={`${label} variant`}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      {url && !hasError && (
        <a
          href={url}
          download
          target="_blank"
          rel="noreferrer"
          className="text-[9px] font-marker tracking-wider text-[#fde047]/70 hover:text-[#fde047] underline underline-offset-2 transition"
        >
          Download
        </a>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border bg-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <FileImage className="h-4 w-4 text-[#fde047] shrink-0" />
        <p className="text-xs font-display tracking-widest truncate" title={name}>{name}</p>
      </div>
      <p className="text-[10px] text-muted-foreground font-mono truncate">{slug}</p>
      <div className="flex gap-2">
        <ImageSlot url={blackUrl} loading={loadingBlack} hasError={errorBlack} label="Black" bg="bg-zinc-900/60" />
        <ImageSlot url={whiteUrl} loading={loadingWhite} hasError={errorWhite} label="White" bg="bg-zinc-100/10" />
      </div>
    </motion.div>
  );
};

// ─── Access Log ───────────────────────────────────────────────────────────────

const AccessLog = () => {
  const { data: rows = [], isLoading } = useQuery<AccessLogRow[]>({
    queryKey: ["file-access-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_access_log")
        .select("id, email, file_path, accessed_at")
        .order("accessed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="border border-border bg-card">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <Eye className="h-4 w-4 text-[#fde047]" />
        <h2 className="font-display tracking-widest text-sm">ACCESS LOG</h2>
        <span className="ml-auto text-xs text-muted-foreground font-marker">{rows.length} entries</span>
      </div>
      {isLoading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-marker text-muted-foreground italic text-sm">No access events yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2 text-left font-marker tracking-widest text-muted-foreground uppercase text-[10px]">Email</th>
                <th className="px-4 py-2 text-left font-marker tracking-widest text-muted-foreground uppercase text-[10px]">File</th>
                <th className="px-4 py-2 text-left font-marker tracking-widest text-muted-foreground uppercase text-[10px]">Accessed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20 transition">
                  <td className="px-4 py-2 text-muted-foreground">{row.email}</td>
                  <td className="px-4 py-2 font-mono text-[10px]">{row.file_path}</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {new Date(row.accessed_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PrintFiles = () => {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleAccess = async () => {
    if (!emailInput.trim() || !passwordInput) {
      setAuthError("Please enter your email and password.");
      return;
    }
    setVerifying(true);
    setAuthError("");
    try {
      // Validate credentials by attempting a known test path
      await fetchSignedUrl(
        { email: emailInput.trim(), password: passwordInput },
        "test/auth.png",
      );
      // If no error (or 404 from storage but not 401), credentials are valid
      setCreds({ email: emailInput.trim(), password: passwordInput });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Invalid password") || msg.includes("401")) {
        setAuthError("Invalid password. Please try again.");
      } else {
        // Storage 404 (test file doesn't exist) still means auth passed
        // Only a 401 means wrong password — any other error means creds are fine
        setCreds({ email: emailInput.trim(), password: passwordInput });
      }
    } finally {
      setVerifying(false);
    }
  };

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!creds) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm border border-border bg-card p-8 space-y-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-12 w-12 border border-[#fde047]/30 rounded-full flex items-center justify-center bg-[#fde047]/5">
              <Lock className="h-5 w-5 text-[#fde047]" />
            </div>
            <h1 className="font-display text-xl tracking-widest">Print File Access</h1>
            <p className="text-sm text-muted-foreground font-marker">
              Enter your email and the viewer password to access print files.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAccess()}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Password</label>
              <Input
                type="password"
                placeholder="Viewer password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAccess()}
                className="h-9 text-sm"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-400 font-marker">{authError}</p>
            )}

            <Button
              className="w-full h-9 font-display tracking-widest text-sm"
              onClick={handleAccess}
              disabled={verifying}
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Access Files
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Authenticated view ─────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileImage className="h-5 w-5 text-[#fde047]" />
        <div>
          <h1 className="font-display tracking-widest text-lg">PRINT FILES</h1>
          <p className="text-xs text-muted-foreground font-marker">
            {creds.email}{" "}
            <span className="text-green-400">✓</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs font-marker text-muted-foreground"
          onClick={() => {
            setCreds(null);
            setEmailInput("");
            setPasswordInput("");
            toast.info("Signed out of print file viewer.");
          }}
        >
          Sign out
        </Button>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <PrintFileCard
            key={product.id}
            slug={product.id}
            name={product.name}
            creds={creds}
          />
        ))}
      </div>

      {/* Access log */}
      <AccessLog />
    </div>
  );
};

export default PrintFiles;
