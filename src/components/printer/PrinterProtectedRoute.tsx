import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
  </div>
);

// Guards the /printer catalog. Reuses the shared AuthContext session (never opens
// its own getSession — see CLAUDE.md Auth Architecture) and confirms the signed-in
// user is on the printer allowlist via the is_printer RPC.
const PrinterProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isPrinter, setIsPrinter] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    setChecking(true);
    supabase
      .rpc("is_printer" as never, { _user_id: user.id } as never)
      .then(({ data }) => {
        if (!active) return;
        setIsPrinter(!!data);
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [user, loading]);

  if (loading || checking) return <Spinner />;
  if (!user) return <Navigate to="/printer/login" replace />;

  if (!isPrinter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-display text-3xl tracking-widest">NOT ON THE LIST</h1>
          <p className="text-muted-foreground">
            You're signed in, but this account isn't authorized for the print-file portal.
            If that's a mistake, email kristinmitchell@aethyx.space.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PrinterProtectedRoute;
