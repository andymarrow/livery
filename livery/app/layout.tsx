import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/app/_context/AuthContext";
import { ThemeProvider, themeInitScript } from "@/app/_context/ThemeContext";
import { ToastProvider } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CREATOR, SITE } from "@/constants/constants";
import { JsonLd } from "@/components/JsonLd";
import { siteGraph } from "@/lib/seo/schema";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: Turn Any Website Into a Design System for AI Coding Agents`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: CREATOR.handle, url: CREATOR.x }],
  creator: CREATOR.handle,
  publisher: SITE.name,
  category: "technology",
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", siteName: SITE.name, url: "/", locale: "en_US", title: `${SITE.name}: any website's design, as a skill for your coding agent`, description: SITE.description },
  twitter: { card: "summary_large_image", title: `${SITE.name}: any website's design, as a skill for your coding agent`, description: SITE.description, creator: CREATOR.handle },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ed" },
    { media: "(prefers-color-scheme: dark)", color: "#030303" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* Sets data-theme before first paint (no flash). next/script keeps it out of React's render tree. */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <JsonLd data={siteGraph} />
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={300}>
              <ToastProvider>{children}</ToastProvider>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
