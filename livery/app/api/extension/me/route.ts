import { json, requireExtensionUser, unauthorized } from "@/lib/extension/http";
import { revokeToken } from "@/lib/extension/tokens";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Who the extension is connected as. */
export async function GET(request: Request) {
  const user = await requireExtensionUser(request);
  if (!user) return unauthorized();
  const db = getAdminClient();
  const [{ data: profile }, { data: auth }] = await Promise.all([
    db.from("profiles").select("display_name, avatar_url").eq("id", user.userId).maybeSingle(),
    db.auth.admin.getUserById(user.userId),
  ]);
  return json({ name: profile?.display_name ?? null, email: auth.user?.email ?? null, avatar: profile?.avatar_url ?? null });
}

/** Disconnects this extension (its token stops working). */
export async function DELETE(request: Request) {
  const user = await requireExtensionUser(request);
  if (!user) return unauthorized();
  await revokeToken(user.tokenId, user.userId);
  return json({ ok: true });
}
