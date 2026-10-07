"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

// Who is signed in, read in the browser so pages can stay statically cached.
// The server checks the session itself wherever it matters (actions, /me).

type Profile = { display_name: string | null; avatar_url: string | null };
type AuthState = { user: User | null; profile: Profile | null; ready: boolean };

const AuthContext = createContext<AuthState>({ user: null, profile: null, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Without Supabase there is nobody to wait for: ready from the start.
  const [state, setState] = useState<AuthState>(() => ({ user: null, profile: null, ready: !process.env.NEXT_PUBLIC_SUPABASE_URL }));

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    let live = true;
    const load = async (user: User | null) => {
      const profile = user ? ((await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle()).data ?? null) : null;
      if (live) setState({ user, profile, ready: true });
    };
    supabase.auth.getUser().then(({ data }) => load(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => void load(session?.user ?? null));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** A name to show: the profile's, else the provider's, else the email's first part. */
export function displayNameOf(state: AuthState) {
  const meta = state.user?.user_metadata as { display_name?: string; full_name?: string; name?: string } | undefined;
  return state.profile?.display_name ?? meta?.display_name ?? meta?.full_name ?? meta?.name ?? state.user?.email?.split("@")[0] ?? "";
}
