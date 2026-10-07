import {
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUpRight as LucideArrowUpRight,
  BadgeCheck as LucideBadgeCheck,
  Ban as LucideBan,
  BookOpenText as LucideBookOpenText,
  Bot as LucideBot,
  Braces as LucideBraces,
  Check as LucideCheck,
  CircleAlert as LucideCircleAlert,
  CircleCheck as LucideCircleCheck,
  CircleX as LucideCircleX,
  Copy as LucideCopy,
  CornerDownLeft as LucideCornerDownLeft,
  CreditCard as LucideCreditCard,
  Download as LucideDownload,
  FileCode as LucideFileCode,
  FileText as LucideFileText,
  FileX as LucideFileX,
  Fingerprint as LucideFingerprint,
  Folder as LucideFolder,
  FolderCode as LucideFolderCode,
  GitCommitHorizontal as LucideGitCommitHorizontal,
  Hand as LucideHand,
  Hourglass as LucideHourglass,
  Image as LucideImage,
  Inbox as LucideInbox,
  Info as LucideInfo,
  KeyRound as LucideKeyRound,
  LoaderCircle as LucideLoaderCircle,
  LockKeyhole as LucideLockKeyhole,
  Menu as LucideMenu,
  Monitor as LucideMonitor,
  MonitorCheck as LucideMonitorCheck,
  Moon as LucideMoon,
  Paintbrush as LucidePaintbrush,
  Palette as LucidePalette,
  Plus as LucidePlus,
  Puzzle as LucidePuzzle,
  Quote as LucideQuote,
  RotateCw as LucideRotateCw,
  ScrollText as LucideScrollText,
  Search as LucideSearch,
  ShieldCheck as LucideShieldCheck,
  SquareTerminal as LucideSquareTerminal,
  Store as LucideStore,
  Sun as LucideSun,
  SwatchBook as LucideSwatchBook,
  Terminal as LucideTerminal,
  TriangleAlert as LucideTriangleAlert,
  User as LucideUser,
  UserCheck as LucideUserCheck,
  WandSparkles as LucideWandSparkles,
  X as LucideX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The site's icon set. On this branch (goatrank.lol kit): Lucide, 2px stroke,
// round caps, as measured on the source site. Every icon goes through here,
// so the rest of the site keeps the same names. Size with CSS (`size-4`).
export type IconProps = Omit<React.ComponentProps<"svg">, "ref" | "strokeWidth"> & { strokeWidth?: number };

function make(Icon: LucideIcon, name: string) {
  function Wrapped({ strokeWidth, ...props }: IconProps) {
    return <Icon strokeWidth={strokeWidth ?? 2} aria-hidden={props["aria-label"] ? undefined : true} {...props} />;
  }
  Wrapped.displayName = name;
  return Wrapped;
}

export const ArrowLeft = make(LucideArrowLeft, "ArrowLeft");
export const ArrowRight = make(LucideArrowRight, "ArrowRight");
export const ArrowUpRight = make(LucideArrowUpRight, "ArrowUpRight");
export const BadgeCheck = make(LucideBadgeCheck, "BadgeCheck");
export const Ban = make(LucideBan, "Ban");
export const Bot = make(LucideBot, "Bot");
export const Braces = make(LucideBraces, "Braces");
export const Check = make(LucideCheck, "Check");
export const CircleAlert = make(LucideCircleAlert, "CircleAlert");
export const CircleCheck = make(LucideCircleCheck, "CircleCheck");
export const CircleX = make(LucideCircleX, "CircleX");
export const Copy = make(LucideCopy, "Copy");
export const CornerDownLeft = make(LucideCornerDownLeft, "CornerDownLeft");
export const Download = make(LucideDownload, "Download");
export const FileText = make(LucideFileText, "FileText");
export const Fingerprint = make(LucideFingerprint, "Fingerprint");
export const Folder = make(LucideFolder, "Folder");
export const GitCommitHorizontal = make(LucideGitCommitHorizontal, "GitCommitHorizontal");
export const Hand = make(LucideHand, "Hand");
export const Hourglass = make(LucideHourglass, "Hourglass");
export const Image = make(LucideImage, "Image");
export const Inbox = make(LucideInbox, "Inbox");
export const Info = make(LucideInfo, "Info");
export const KeyRound = make(LucideKeyRound, "KeyRound");
export const LoaderCircle = make(LucideLoaderCircle, "LoaderCircle");
export const LockKeyhole = make(LucideLockKeyhole, "LockKeyhole");
export const Menu = make(LucideMenu, "Menu");
export const Monitor = make(LucideMonitor, "Monitor");
export const Moon = make(LucideMoon, "Moon");
export const Paintbrush = make(LucidePaintbrush, "Paintbrush");
export const Palette = make(LucidePalette, "Palette");
export const Plus = make(LucidePlus, "Plus");
export const RotateCw = make(LucideRotateCw, "RotateCw");
export const Search = make(LucideSearch, "Search");
export const ShieldCheck = make(LucideShieldCheck, "ShieldCheck");
export const Sun = make(LucideSun, "Sun");
export const Terminal = make(LucideTerminal, "Terminal");
export const TriangleAlert = make(LucideTriangleAlert, "TriangleAlert");
export const User = make(LucideUser, "User");
export const X = make(LucideX, "X");
export const BookOpen = make(LucideBookOpenText, "BookOpen");
export const CardBlocked = make(LucideCreditCard, "CardBlocked");
export const CodeFolder = make(LucideFolderCode, "CodeFolder");
export const FileCode = make(LucideFileCode, "FileCode");
export const FileRemove = make(LucideFileX, "FileRemove");
export const FingerprintCheck = make(LucideFingerprint, "FingerprintCheck");
export const License = make(LucideScrollText, "License");
export const Puzzle = make(LucidePuzzle, "Puzzle");
export const Quote = make(LucideQuote, "Quote");
export const SquareTerminal = make(LucideSquareTerminal, "SquareTerminal");
export const StoreVerified = make(LucideStore, "StoreVerified");
export const Swatch = make(LucideSwatchBook, "Swatch");
export const UserCheck = make(LucideUserCheck, "UserCheck");
export const WandSparkles = make(LucideWandSparkles, "WandSparkles");
export const WebValidation = make(LucideMonitorCheck, "WebValidation");

/** Each kit file gets an icon that says what it holds. */
export function fileIcon(path: string) {
  if (path === "SKILL.md") return WandSparkles;
  if (path === "tokens.json") return Swatch;
  if (path === "rules.md" || path === "owner-rules.md") return BookOpen;
  if (path === "voice.md") return Quote;
  if (path === "licences.md") return License;
  if (path.startsWith("frames")) return Image;
  if (path.endsWith(".json")) return Braces;
  return FileText;
}
