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
  X,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/upload", label: "Add Memory", icon: PlusCircle },
  { href: "/timeline", label: "Health Timeline", icon: Clock },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Memory Size", icon: BarChart3 },
  { href: "/summarize", label: "Summarize", icon: FileText },
];

const STORAGE_KEY = "sidebar-collapsed";

type NavProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export function Nav({ mobileOpen = false, onClose }: NavProps) {
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

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`fixed inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <nav
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-white/10 bg-midnight-charcoal/95 backdrop-blur-xl transition-[transform,width] duration-200 ease-in-out md:relative md:inset-auto md:translate-x-0 md:bg-midnight-charcoal/80 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-[4.5rem]" : "md:w-56"}`}
      >
        <div className="flex sticky top-0 flex-col gap-1 p-4 h-full min-h-0">
          <div
            className={`mb-4 flex items-center gap-2 ${
              collapsed ? "justify-center md:justify-center" : "justify-between"
            }`}
          >
            {!collapsed && (
              <Link
                href="/"
                onClick={handleNavClick}
                className="min-w-0 flex-1 px-3 py-2 text-lg font-semibold text-neon-cyan truncate"
              >
                Health Memory AI
              </Link>
            )}
            {/* Mobile: close button. Desktop: collapse toggle */}
            <button
              type="button"
              onClick={() => (mobileOpen ? onClose?.() : toggleCollapsed())}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all duration-200 touch-manipulation"
              title={
                mobileOpen
                  ? "Close menu"
                  : collapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
              aria-label={
                mobileOpen ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : collapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-1 min-h-0 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] ${
                    collapsed ? "justify-center md:justify-center" : ""
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
        </div>
      </nav>
    </>
  );
}
