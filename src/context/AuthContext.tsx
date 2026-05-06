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
    if (fetchingForRef.current === userId) {
      console.log('[Auth] fetchProfile deduplicated for', userId);
      return;
    }
    console.log('[Auth] fetchProfile start', userId);
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
          console.error("[Auth] fetchProfile query error:", result.error);
        } else {
          console.log('[Auth] fetchProfile success', { is_admin: result.data?.is_admin });
          setProfile(result.data);
        }
      }
    } catch (err) {
      console.error("[Auth] fetchProfile failed or timed out:", err);
    } finally {
      console.log('[Auth] fetchProfile finally → setLoading(false)');
      setLoading(false);
      fetchingForRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange handles post-init events only.
    // INITIAL_SESSION is intentionally skipped — getSession() below is the
    // single authoritative init path. Handling INITIAL_SESSION here too
    // creates a race: if it fires after getSession() already cleared loading,
    // it re-sets loading=true and can leave the spinner stuck or clear user.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      console.log(`[Auth] onAuthStateChange: ${event}`, { user: newSession?.user?.email ?? null });
      if (event === 'INITIAL_SESSION') {
        console.log('[Auth] INITIAL_SESSION skipped — getSession() is authoritative');
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        setLoading(true);
        fetchProfile(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        fetchingForRef.current = null;
        setLoading(false);
      }
      // TOKEN_REFRESHED / USER_UPDATED: session updated above, no spinner needed.
    });

    // Single authoritative init: resolve the session once on mount.
    supabase.auth
      .getSession()
      .then(({ data: { session: existing } }) => {
        if (!mounted) return;
        console.log('[Auth] getSession resolved', { user: existing?.user?.email ?? null });
        setSession(existing);
        setUser(existing?.user ?? null);
        if (existing?.user) {
          // loading stays true; fetchProfile clears it in finally
          fetchProfile(existing.user.id);
        } else {
          console.log('[Auth] no session → loading cleared');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[Auth] getSession error', err);
        if (mounted) setLoading(false);
      });

    // Hard failsafe: spinner can never stay up more than 8 s no matter what.
    const failsafe = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] 8-second failsafe fired — loading forced to false');
        setLoading(false);
      }
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
