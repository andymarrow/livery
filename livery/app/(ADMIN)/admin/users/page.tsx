import { isAdmin } from "@/lib/adminSession";
import { adminUsers } from "@/services/moderation";
import { AdminPage } from "../_components/AdminPage";
import { UsersManager } from "../_components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  if (!(await isAdmin())) return null;
  const users = await adminUsers();
  return (
    <AdminPage title="Users" description="Every account: what they own, what they've measured with the extension, and how to step in.">
      <UsersManager users={users} />
    </AdminPage>
  );
}
