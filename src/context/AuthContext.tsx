import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);       // true until we know if a user exists
  const [profileLoading, setProfileLoading] = useState(false); // true while fetching profile

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      // Race the Supabase query against a 6-second timeout so a slow/hanging
      // network call never leaves the admin dashboard in an infinite spinner.
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
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST (per Supabase guidance)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setLoading(false); // we know a user exists — unblock ProtectedRoute immediately
        setTimeout(() => {
          fetchProfile(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Then check existing session — onAuthStateChange fires for this too,
    // so we only clear loading here if there's no user.
    supabase.auth
      .getSession()
      .then(({ data: { session: existing } }) => {
        if (!existing?.user) {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    return () => subscription.unsubscribe();
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
        profileLoading,
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
