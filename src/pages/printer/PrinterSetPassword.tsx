import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Loader2, CheckCircle2 } from "lucide-react";

// Landing page for the invite/recovery link. Supabase establishes the session from
// the URL automatically (detectSessionInUrl); here the printer sets their password,
// then sees the "this is a backup" message.
export default function PrinterSetPassword() {
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
      </div>
    );
  }

  // Success — show the backup message the client specified.
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-[#fde047] mx-auto" />
          <h1 className="font-display text-2xl tracking-widest">YOU'RE ALL SET</h1>
          <div className="text-sm text-muted-foreground space-y-3 text-left bg-zinc-900 border border-border rounded p-5 leading-relaxed">
            <p>
              <span className="text-foreground font-semibold">This portal is a backup.</span> You should
              receive the print files as links in every order email — that's your primary source for each job.
            </p>
            <p>
              If you ever have trouble with an order's files, email{" "}
              <a href="mailto:kristinmitchell@aethyx.space" className="text-[#fde047]">
                kristinmitchell@aethyx.space
              </a>
              .
            </p>
            <p>In the meantime you'll always have access to the whole catalog of graphics right here.</p>
          </div>
          <Link
            to="/printer"
            className="inline-block bg-[#fde047] text-black font-display tracking-widest px-8 py-3 rounded hover:bg-[#fde047]/90 transition"
          >
            OPEN THE CATALOG
          </Link>
        </div>
      </div>
    );
  }

  // No session from the link → expired / invalid.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl tracking-widest">LINK EXPIRED</h1>
          <p className="text-sm text-muted-foreground">
            This set-password link is no longer valid. Email{" "}
            <a href="mailto:kristinmitchell@aethyx.space" className="text-[#fde047]">
              kristinmitchell@aethyx.space
            </a>{" "}
            and we'll send a fresh one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl tracking-widest text-[#fde047]">CREATE YOUR PASSWORD</h1>
          <p className="text-sm text-muted-foreground">Set a password for the print-file portal.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-display tracking-widest text-muted-foreground">NEW PASSWORD</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#fde047]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-display tracking-widest text-muted-foreground">CONFIRM PASSWORD</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-zinc-900 border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#fde047]"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-[#fde047] text-black font-display tracking-widest py-3 rounded hover:bg-[#fde047]/90 transition disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} SET PASSWORD
          </button>
        </form>
      </div>
    </div>
  );
}
