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
  loading: boolean;       // true until we know whether a session exists
  profileLoading: boolean;  // true while fetching profile row
  profileFetched: boolean;  // true after first fetch attempt completes (success or fail)
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession]           = useState<Session | null>(null);
  const [user, setUser]                 = useState<User | null>(null);
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);

  // Guard against calling fetchProfile twice for the same user
  const fetchingForRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchingForRef.current === userId) return; // already in-flight for this user
    fetchingForRef.current = userId;
    setProfileLoading(true);

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
      setProfileLoading(false);
      setProfileFetched(true);
      fetchingForRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange handles FUTURE auth events (login, logout, token refresh).
    // We do NOT rely on it for the initial session — getSession handles that below.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setLoading(false);
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setProfileFetched(false);
        fetchingForRef.current = null;
        setLoading(false);
      }
    });

    // Resolve the initial session directly — never wait on INITIAL_SESSION event,
    // which is unreliable across Supabase JS versions.
    supabase.auth
      .getSession()
      .then(({ data: { session: existing } }) => {
        if (!mounted) return;
        if (existing?.user) {
          setSession(existing);
          setUser(existing.user);
          setLoading(false);
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
    setProfileFetched(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin: !!profile?.is_admin,
        loading,
        profileLoading,
        profileFetched,
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
