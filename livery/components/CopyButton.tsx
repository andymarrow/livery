"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "inverse" | "soft";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  className?: string;
  disabled?: boolean;
};

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  variant = "secondary",
  size = "sm",
  className,
  disabled,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browsers or blocked permission: fall back to a hidden textarea.
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  const iconOnly = size === "icon" || size === "icon-sm";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      disabled={disabled}
      aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
      className={cn("relative", className)}
    >
      <span className="relative inline-flex size-[1em] items-center justify-center [&_svg]:absolute">
        <Copy className={cn("transition-[transform,opacity] duration-150 ease-out-soft", copied && "scale-50 opacity-0")} />
        <Check className={cn("transition-[transform,opacity] duration-150 ease-out-soft", copied ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
      </span>
      {!iconOnly && <span aria-live="polite">{copied ? copiedLabel : label}</span>}
    </Button>
  );
}
