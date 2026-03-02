"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";

const STORAGE_KEY = "health-memory-onboarding";

type OnboardingState = {
  dismissed: boolean;
  triedChat: boolean;
  viewedTimeline: boolean;
};

const defaultState: OnboardingState = {
  dismissed: false,
  triedChat: false,
  viewedTimeline: false,
};

function loadState(): OnboardingState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

function saveState(s: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

type OnboardingChecklistProps = {
  entriesCount: number;
  hasSummarized: boolean;
};

export function OnboardingChecklist({ entriesCount, hasSummarized }: OnboardingChecklistProps) {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  const addedMemory = entriesCount > 0;
  const summarized = hasSummarized;

  if (state.dismissed) return null;
  if (addedMemory && state.triedChat && state.viewedTimeline) {
    return null;
  }

  const steps = [
    {
      id: "add",
      done: addedMemory,
      label: "Add your first memory",
      href: "/upload",
      action: "Add memory",
    },
    {
      id: "chat",
      done: state.triedChat,
      label: "Try a question in AI Chat",
      href: "/chat",
      action: "Try chat",
    },
    {
      id: "timeline",
      done: state.viewedTimeline,
      label: "View your Health Timeline",
      href: "/timeline",
      action: "View timeline",
    },
    ...(addedMemory && entriesCount >= 5
      ? [
          {
            id: "summarize" as const,
            done: summarized,
            label: "Create a summary of your records",
            href: "/summarize",
            action: "Summarize",
          },
        ]
      : []),
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = steps.every((s) => s.done);

  const markDismissed = () => {
    const next = { ...state, dismissed: true };
    setState(next);
    saveState(next);
  };

  const markTriedChat = () => {
    const next = { ...state, triedChat: true };
    setState(next);
    saveState(next);
  };

  const markViewedTimeline = () => {
    const next = { ...state, viewedTimeline: true };
    setState(next);
    saveState(next);
  };

  return (
    <div className="mt-6 glass-panel rounded-xl border border-neon-cyan/20 overflow-hidden animate-fade-slide-up">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Get started
          {!allDone && (
            <span className="ml-2 text-[var(--text-muted)] font-normal">
              {doneCount}/{steps.length}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[var(--text-muted)]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); markDismissed(); }}
            className="p-1 rounded hover:bg-white/10 hover:text-[var(--text-primary)]"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          {collapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </button>
      {!collapsed && (
        <ul className="border-t border-white/10 px-4 py-3 space-y-2">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  step.done
                    ? "bg-neon-cyan/20 text-neon-cyan"
                    : "bg-white/10 text-[var(--text-muted)]"
                }`}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : steps.indexOf(step) + 1}
              </span>
              <span className="flex-1 text-sm text-[var(--text-primary)]">{step.label}</span>
              {!step.done && (
                <Link
                  href={step.href}
                  className="text-xs font-medium text-neon-cyan hover:underline shrink-0"
                  onClick={() => {
                    if (step.id === "chat") markTriedChat();
                    if (step.id === "timeline") markViewedTimeline();
                  }}
                >
                  {step.action} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
