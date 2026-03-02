"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { getTags } from "@/lib/api";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
};

export function TagInput({
  value,
  onChange,
  placeholder = "e.g. cardiologist, 2024 physical",
  "aria-label": ariaLabel,
  id,
  disabled,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTags()
      .then(setAvailableTags)
      .catch(() => {});
  }, []);

  const normalized = inputValue.trim().toLowerCase();
  useEffect(() => {
    if (!normalized) {
      setSuggestions([]);
      return;
    }
    const filtered = availableTags.filter(
      (t) => t.toLowerCase().includes(normalized) && !value.includes(t)
    );
    setSuggestions(filtered.slice(0, 8));
  }, [normalized, availableTags, value]);

  const addTag = useCallback(
    (tag: string) => {
      const t = tag.trim().toLowerCase();
      if (!t || value.includes(t)) return;
      onChange([...value, t]);
      setInputValue("");
      setShowSuggestions(false);
    },
    [value, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  function handleBlur() {
    if (inputValue.trim()) addTag(inputValue.trim());
    setShowSuggestions(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border bg-midnight/50 px-3 py-2 text-sm min-h-[42px] ${
          disabled ? "opacity-60" : ""
        } ${
          showSuggestions && suggestions.length > 0
            ? "border-neon-cyan/50 ring-1 ring-neon-cyan/30"
            : "border-white/20 focus-within:border-neon-cyan focus-within:ring-1 focus-within:ring-neon-cyan"
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-neon-cyan/20 px-2 py-0.5 text-xs font-medium text-neon-cyan"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded p-0.5 hover:bg-neon-cyan/30 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          aria-label={ariaLabel}
          className="flex-1 min-w-[120px] bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none py-0.5"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full rounded-lg border border-white/20 bg-midnight-charcoal py-1 shadow-xl max-h-40 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-neon-cyan/10 hover:text-neon-cyan"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag);
                }}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
