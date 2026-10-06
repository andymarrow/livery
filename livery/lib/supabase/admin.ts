import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: ReturnType<typeof createClient<Database>> | undefined;

// Service-role client. Bypasses RLS, so it must only ever run on the server.
export function getAdminClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
