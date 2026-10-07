import type { Metadata } from "next";
import { SignInForm } from "./_components/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error } = await searchParams;
  return <SignInForm next={typeof next === "string" ? next : undefined} error={typeof error === "string" ? error.slice(0, 200) : undefined} />;
}
