import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = true }: ProtectedRouteProps) => {
  const { user, isAdmin, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Phase 1 — auth state genuinely unknown (cold load, no user yet)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
      </div>
    );
  }

  // Auth resolved, no user → send to login
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Phase 2 — user confirmed, waiting for profile/isAdmin to resolve
  if (requireAdmin && profileLoading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
      </div>
    );
  }

  // Profile resolved, user is not admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-display text-3xl tracking-widest">NOT ON THE LIST</h1>
          <p className="text-muted-foreground">
            This door's locked. You're signed in but not flagged as an admin.
          </p>
          <a
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-[#fde047] text-black font-display tracking-widest hover:bg-[#fde047]/90 transition"
          >
            BACK TO THE BAR
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
