import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPairingCode } from "@/lib/extension/tokens";
import { currentUser } from "@/utils/supabase/server";
import { PairingCode } from "./_components/PairingCode";

export const metadata: Metadata = { title: "Connect the extension", robots: { index: false } };
export const dynamic = "force-dynamic";

// The extension opens this page to connect to the signed-in account. It reads
// the code from the page (its script runs only here) and trades it for a
// token; the code also works typed in by hand.
export default async function ConnectExtensionPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/extension/connect");
  const { code, expiresInSeconds } = await createPairingCode(user.id);
  return (
    <section className="flex flex-1 items-center px-4 py-16 sm:px-6">
      <PairingCode code={code} expiresInSeconds={expiresInSeconds} issuedAt={new Date().toISOString()} />
    </section>
  );
}
