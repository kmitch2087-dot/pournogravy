import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Password sign-in for the printer portal. On success, routes to /printer.
export default function PrinterLogin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in → skip straight to the catalog.
  useEffect(() => {
    if (!authLoading && user) navigate("/printer", { replace: true });
  }, [authLoading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/printer", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl tracking-widest text-[#fde047]">PRINTER PORTAL</h1>
          <p className="text-sm text-muted-foreground">Sign in to access the print-file catalog.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-display tracking-widest text-muted-foreground">EMAIL</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#fde047]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-display tracking-widest text-muted-foreground">PASSWORD</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#fde047]"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-[#fde047] text-black font-display tracking-widest py-3 rounded hover:bg-[#fde047]/90 transition disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} SIGN IN
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Trouble getting in? Email{" "}
          <a href="mailto:kristinmitchell@aethyx.space" className="text-[#fde047]">
            kristinmitchell@aethyx.space
          </a>
        </p>
      </div>
    </div>
  );
}
