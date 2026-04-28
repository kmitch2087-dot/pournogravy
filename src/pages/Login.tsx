import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/account";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (mode === "signup") {
      toast.success("Check your email to confirm your account.");
    } else {
      toast.success("Welcome back.");
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 pt-32">
      <div className="w-full max-w-md">
        <div className="border border-[#fde047]/20 bg-card p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl tracking-widest">
              {mode === "signin" ? "WELCOME BACK" : "JOIN THE BAR"}
            </h1>
            <p className="font-marker text-xs tracking-[0.3em] uppercase text-muted-foreground">
              {mode === "signin" ? "Pour yourself in" : "Tab opens here"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90"
              style={{ boxShadow: "0 0 20px rgba(253,224,71,0.25)" }}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                "SIGN IN"
              ) : (
                "CREATE ACCOUNT"
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              {mode === "signin"
                ? "First time? Create an account"
                : "Already have an account? Sign in"}
            </button>
            <div>
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                Back to the bar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
