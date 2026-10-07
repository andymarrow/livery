import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <main className="flex flex-1 flex-col bg-bg">{children}</main>;
}
