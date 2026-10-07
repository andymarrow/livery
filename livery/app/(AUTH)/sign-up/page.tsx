import type { Metadata } from "next";
import { SignUpForm } from "./_components/SignUpForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next } = await searchParams;
  return <SignUpForm next={typeof next === "string" ? next : undefined} />;
}
