"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="text-inherit">{children}</li>,
  h1: ({ children }) => <h1 className="text-lg font-semibold text-[var(--text-primary)] mt-3 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold text-[var(--text-primary)] mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-2 mb-1 first:mt-0">{children}</h3>,
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-[var(--text-primary)] font-mono text-[0.9em]" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={`block rounded-lg bg-white/5 border border-white/10 p-3 overflow-x-auto text-sm font-mono text-[var(--text-primary)] ${className ?? ""}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-neon-cyan/50 pl-3 my-2 text-[var(--text-muted)] italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-neon-cyan hover:underline"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border border-white/10 rounded-lg overflow-hidden">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-white/10 last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-[var(--text-primary)]">{children}</td>
  ),
  hr: () => <hr className="border-white/10 my-3" />,
};

export interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with app-themed styling (lists, headers, code, links, tables).
 * Safe for user/summary content; links open in new tab.
 */
export function MarkdownViewer({ content, className = "" }: MarkdownViewerProps) {
  if (!content?.trim()) return null;
  return (
    <div className={`markdown-viewer text-sm text-[var(--text-primary)] ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
