"use client";

import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { LogIn, UserPlus, Menu, Search, Plus } from "lucide-react";

type AppHeaderProps = {
  onMenuClick?: () => void;
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-midnight-charcoal/80 px-4 py-3 backdrop-blur-xl">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all duration-200 touch-manipulation md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex flex-1 justify-end gap-2 min-w-0 items-center">
      <SignedIn>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("openQuickAdd"))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-neon-cyan transition-all duration-200 touch-manipulation"
          aria-label="Quick add memory"
          title="Quick add memory (N)"
        >
          <Plus className="h-5 w-5" />
        </button>
        <Link
          href="/search"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all duration-200 touch-manipulation"
          aria-label="Search"
          title="Search timeline, summaries, and chat"
        >
          <Search className="h-5 w-5" />
        </Link>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </SignedIn>
      <SignedOut>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/10 transition-all duration-200">
              <LogIn className="h-5 w-5 shrink-0" />
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all duration-200">
              <UserPlus className="h-5 w-5 shrink-0" />
              Sign up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>
      </div>
    </header>
  );
}
