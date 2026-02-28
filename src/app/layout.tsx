import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Health Memory AI",
  description: "Personal health knowledge base. Organize medical history, preserve context with AI summaries.",
};

// Avoid static prerender so Clerk env vars are only needed at runtime (e.g. in Docker).
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={sourceSans.variable}>
        <body className="min-h-screen font-sans antialiased bg-midnight text-[var(--text-primary)]">
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
