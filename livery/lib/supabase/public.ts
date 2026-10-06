import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: ReturnType<typeof createClient<Database>> | undefined;

// Anon client for reading published kits from server components. RLS limits
// it to ready versions. No cookies: v1 has no accounts.
export function getPublicClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
