import { adminConfigured, isAdmin } from "@/lib/adminSession";
import { AdminShell } from "./_components/AdminShell";
import { SignInForm } from "./_components/SignInForm";

// Builds and rebuilds run as server actions from these pages.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export default async function AdminAreaLayout({ children }: LayoutProps<"/admin">) {
  if (!adminConfigured() || !(await isAdmin())) return <SignInForm />;
  return <AdminShell>{children}</AdminShell>;
}
