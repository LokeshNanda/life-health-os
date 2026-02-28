"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import {
  PlusCircle,
  Clock,
  MessageSquare,
  BarChart3,
  FileText,
  LogIn,
  UserPlus,
} from "lucide-react";

const navItems = [
  { href: "/upload", label: "Add Memory", icon: PlusCircle },
  { href: "/timeline", label: "Health Timeline", icon: Clock },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Memory Size", icon: BarChart3 },
  { href: "/summarize", label: "Summarize", icon: FileText },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 border-r border-white/10 bg-midnight-charcoal/80 backdrop-blur-xl">
      <div className="sticky top-0 flex flex-col gap-1 p-4 h-full">
        <Link
          href="/"
          className="mb-4 px-3 py-2 text-lg font-semibold text-neon-cyan"
        >
          Health Memory AI
        </Link>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-neon-cyan/15 text-neon-cyan shadow-glow-soft"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
        <div className="mt-auto pt-4 border-t border-white/10">
          <SignedIn>
            <div className="flex items-center gap-3 px-3 py-2">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
              <span className="text-xs text-[var(--text-muted)] truncate flex-1">
                Account
              </span>
            </div>
          </SignedIn>
          <SignedOut>
            <div className="flex flex-col gap-1">
              <SignInButton mode="modal">
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/10 transition-all duration-200">
                  <LogIn className="h-5 w-5 shrink-0" />
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all duration-200">
                  <UserPlus className="h-5 w-5 shrink-0" />
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}
