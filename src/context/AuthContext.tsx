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

  // Prevents duplicate in-flight fetches for the same user
  const fetchingForRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchingForRef.current === userId) return;
    fetchingForRef.current = userId;
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("profile fetch timeout")), 6000),
      );
      const queryPromise = supabase
        .from("profiles")
        .select("id, email, display_name, is_admin")
        .eq("id", userId)
        .maybeSingle();

      const result = await Promise.race([queryPromise, timeoutPromise]);

      if (result && "data" in result) {
        if (result.error) {
          console.error("[fetchProfile] query error:", result.error);
        } else {
          setProfile(result.data);
        }
      }
    } catch (err) {
      console.error("[fetchProfile] failed or timed out:", err);
    } finally {
      // loading clears here — after the profile is settled (or timed out).
      // ProtectedRoute only needs this single gate; no profileFetched needed.
      setLoading(false);
      fetchingForRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange handles future events (login, logout, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Only block the UI and re-fetch the profile on actual sign-in or
        // first load. TOKEN_REFRESHED just swaps the session tokens — the
        // profile (is_admin) hasn't changed, so no spinner needed.
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setLoading(true);
          fetchProfile(newSession.user.id);
        }
      } else {
        setProfile(null);
        fetchingForRef.current = null;
        setLoading(false);
      }
    });

    // Resolve the initial session directly — don't rely on INITIAL_SESSION event,
    // which is unreliable across Supabase JS versions.
    supabase.auth
      .getSession()
      .then(({ data: { session: existing } }) => {
        if (!mounted) return;
        if (existing?.user) {
          setSession(existing);
          setUser(existing.user);
          // loading stays true; fetchProfile will clear it in finally
          fetchProfile(existing.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => { if (mounted) setLoading(false); });

    return () => {
      mounted = false;
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
      value={{
        user,
        session,
        profile,
        isAdmin: !!profile?.is_admin,
        loading,
        signIn,
        signUp,
        signOut,
      }}
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
