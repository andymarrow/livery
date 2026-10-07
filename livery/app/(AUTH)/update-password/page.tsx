import type { Metadata } from "next";
import { UpdatePasswordForm } from "./_components/UpdatePasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />;
}
