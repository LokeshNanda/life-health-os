"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  PlusCircle,
  Clock,
  MessageSquare,
  BarChart3,
  FileText,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const navItems = [
  { href: "/upload", label: "Add Memory", icon: PlusCircle },
  { href: "/timeline", label: "Health Timeline", icon: Clock },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Memory Size", icon: BarChart3 },
  { href: "/summarize", label: "Summarize", icon: FileText },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Nav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <nav
      className={`shrink-0 border-r border-white/10 bg-midnight-charcoal/80 backdrop-blur-xl transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-[4.5rem]" : "w-56"
      }`}
    >
      <div className="sticky top-0 flex flex-col gap-1 p-4 h-full">
        <div
          className={`mb-4 flex items-center gap-2 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <Link
              href="/"
              className="min-w-0 flex-1 px-3 py-2 text-lg font-semibold text-neon-cyan truncate"
            >
              Health Memory AI
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all duration-200"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-neon-cyan/15 text-neon-cyan shadow-glow-soft"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
