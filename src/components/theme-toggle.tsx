"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  window.addEventListener("storage", onStoreChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("bookops-theme", theme);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="grid grid-cols-2 border-2 border-line" suppressHydrationWarning>
      {(["dark", "light"] as const).map((option) => {
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(option)}
            className={`px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] ${
              active ? "bg-signal text-on-signal" : "bg-panel text-ink"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
