import { isAdmin } from "@/lib/adminSession";
import { adminKitList } from "@/services/admin";
import { AdminPage } from "../_components/AdminPage";
import { KitsManager } from "../_components/KitsManager";

export default async function KitsPage() {
  if (!(await isAdmin())) return null;
  const kits = await adminKitList();
  return (
    <AdminPage title="Kits" description="Every kit in the library. Rename, feature, hide, give it a cover, rebuild it, or combine kits into a taste.">
      <KitsManager kits={kits} />
    </AdminPage>
  );
}
