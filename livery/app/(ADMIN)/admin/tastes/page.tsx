import { isAdmin } from "@/lib/adminSession";
import { adminKitList } from "@/services/admin";
import { AdminPage } from "../_components/AdminPage";
import { TasteManager } from "../_components/TasteManager";

export default async function TastesAdminPage({ searchParams }: PageProps<"/admin/tastes">) {
  if (!(await isAdmin())) return null;
  const { edit } = await searchParams;
  const kits = await adminKitList();
  return (
    <AdminPage title="Tastes" description="Combined kits and the sites behind them. Changing the sites publishes a new version; older installs keep working.">
      <TasteManager combined={kits.filter((k) => k.kind !== "page")} pages={kits.filter((k) => k.kind === "page" && k.latest?.status === "ready")} initialEdit={typeof edit === "string" ? edit : null} />
    </AdminPage>
  );
}
