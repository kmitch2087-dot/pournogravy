import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchingForRef = useRef<string | null>(null);
  // Tracks the user ID whose profile is currently loaded.
  // Used in the onAuthStateChange handler (which captures stale closure state)
  // to skip setting loading=true when SIGNED_IN fires for an already-loaded session.
  const loadedProfileIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchingForRef.current === userId) return;
    fetchingForRef.current = userId;
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("profile fetch timeout")), 12000),
      );
      const queryPromise = supabase
        .from("profiles")
        .select("id, email, display_name, is_admin")
        .eq("id", userId)
        .maybeSingle();

      const result = await Promise.race([queryPromise, timeoutPromise]);

      if (result && "data" in result) {
        if (result.error) {
          console.error("[Auth] fetchProfile error:", result.error);
        } else {
          setProfile(result.data);
          loadedProfileIdRef.current = result.data?.id ?? null;
        }
      }
    } catch (err) {
      console.error("[Auth] fetchProfile failed:", err);
    } finally {
      setLoading(false);
      fetchingForRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // CRITICAL: INITIAL_SESSION is never handled here.
    // getSession() below is the single authoritative init path.
    // Handling INITIAL_SESSION in onAuthStateChange creates a race that
    // re-sets loading=true after getSession() already cleared it.
    // See CLAUDE.md → Auth Architecture for full explanation.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return; // intentionally skipped

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && newSession?.user) {
        // Only show the loading spinner if this is actually a new sign-in (different user
        // or no profile loaded yet). Supabase can fire SIGNED_IN during token auto-refresh
        // for an already-authenticated session, which would otherwise cause a spurious
        // spinner that drops the user out of the admin mid-navigation.
        if (loadedProfileIdRef.current !== newSession.user.id) {
          setLoading(true);
        }
        fetchProfile(newSession.user.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        loadedProfileIdRef.current = null;
        fetchingForRef.current = null;
        setLoading(false);
      }
    });

    // Single authoritative init
    supabase.auth
      .getSession()
      .then(({ data: { session: existing } }) => {
        if (!mounted) return;
        setSession(existing);
        setUser(existing?.user ?? null);
        if (existing?.user) {
          fetchProfile(existing.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[Auth] getSession error:", err);
        if (mounted) setLoading(false);
      });

    // Hard failsafe: spinner never stays up more than 8s
    const failsafe = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/admin`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin: !!profile?.is_admin, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
