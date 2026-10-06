"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/app/_context/ThemeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Single button for the header: flips between light and dark.
// Both icons are rendered and cross-faded, so the button never changes size.
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const label = resolved === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label} className={cn("relative", className)}>
      <Sun className="absolute scale-100 rotate-0 transition-[transform,opacity] duration-300 ease-out-soft dark:scale-50 dark:-rotate-90 dark:opacity-0" />
      <Moon className="absolute scale-50 rotate-90 opacity-0 transition-[transform,opacity] duration-300 ease-out-soft dark:scale-100 dark:rotate-0 dark:opacity-100" />
    </Button>
  );
}

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

// Three-way switch for the footer, where "follow my system" belongs.
export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5", className)}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-colors duration-150",
              active ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
