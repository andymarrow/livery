import { isAdmin } from "@/lib/adminSession";
import { adminActivity } from "@/services/moderation";
import { ActivityFeed } from "../_components/ActivityFeed";
import { AdminPage } from "../_components/AdminPage";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  if (!(await isAdmin())) return null;
  const items = await adminActivity(200);
  return (
    <AdminPage title="Activity" description="The last two weeks: sign-ups, what people published, private versions, pages measured with the extension, takedowns and failed builds.">
      <ActivityFeed items={items} />
    </AdminPage>
  );
}
