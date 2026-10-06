"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Fades and lifts content in once, the first time it scrolls into view.
// With reduced motion the content is simply there.
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Reduced motion is handled in CSS (motion-reduce: classes), so nothing to do here.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-visible={visible || undefined}
      style={{ transitionDelay: visible ? `${delay}ms` : undefined }}
      className={cn(
        "translate-y-3 opacity-0 transition-[opacity,transform] duration-700 ease-out-soft data-[visible]:translate-y-0 data-[visible]:opacity-100",
        "motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
