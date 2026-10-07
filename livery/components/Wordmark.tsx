"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/_context/ThemeContext";
import TechText from "@/components/react-bits/TechText";

// The footer wordmark: React Bits' TechText in Livery's colours. Letters can
// be pointed at and dragged; they spring back home. Colours are read from the
// theme tokens so the canvas follows light and dark.
export function Wordmark() {
  const { resolved } = useTheme();
  const [colours, setColours] = useState<{ fg: string; accent: string } | null>(null);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canvas colours come from the DOM after a theme change
    setColours({ fg: css.getPropertyValue("--fg").trim(), accent: css.getPropertyValue("--accent").trim() });
  }, [resolved]);

  return (
    <div className="aspect-[11/4] w-full" aria-label="livery">
      {colours && (
        <TechText
          text="livery"
          fontWeight={700}
          fontSize={640}
          letterSpacing={-0.05}
          color={colours.fg}
          accentColor={colours.accent}
          reveal="letter"
          dashLength={4}
          dashGap={3}
          strokeWidth={1.5}
          specks={12}
          speed={0.8}
          style={undefined}
        />
      )}
    </div>
  );
}
