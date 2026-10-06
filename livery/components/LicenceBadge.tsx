import { Check, Key, Palette } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/badge";

export type Licence = "free" | "licence_required" | "style_only";

const LICENCES = {
  free: { label: "Free to reuse", short: "Free", variant: "success", Icon: Check },
  licence_required: { label: "Needs a licence", short: "Licence", variant: "warning", Icon: Key },
  style_only: { label: "Style only", short: "Style", variant: "muted", Icon: Palette },
} as const;

// Every item in a kit carries one of these. Unknown items are always "style_only".
export function LicenceBadge({ licence, compact = false }: { licence: Licence; compact?: boolean }) {
  const { label, short, variant, Icon } = LICENCES[licence];
  return (
    <Badge variant={variant} size="sm" title={label}>
      <Icon weight="bold" />
      {compact ? short : label}
    </Badge>
  );
}
