import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Nav } from "@/components/Nav";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Health Memory AI",
  description: "Personal health knowledge base. Organize medical history, preserve context with AI summaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={sourceSans.variable}>
        <body className="min-h-screen font-sans antialiased bg-midnight text-[var(--text-primary)]">
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 p-6 lg:p-8">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
