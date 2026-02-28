"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PlusCircle,
  Clock,
  MessageSquare,
  BarChart3,
  FileText,
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
      <div className="sticky top-0 flex flex-col gap-1 p-4">
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
      </div>
    </nav>
  );
}
