"use server";

import { redirect } from "next/navigation";
import { endAdminSession } from "@/lib/adminSession";

export async function adminSignOut() {
  await endAdminSession();
  redirect("/admin");
}
