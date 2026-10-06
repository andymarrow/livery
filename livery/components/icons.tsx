import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Alert02Icon,
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowTurnBackwardIcon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  CommandLineIcon,
  ComputerIcon,
  Copy01Icon,
  Download04Icon,
  File01Icon,
  FingerPrintIcon,
  Folder01Icon,
  GitCommitIcon,
  HandIcon,
  HourglassIcon,
  Image01Icon,
  InboxIcon,
  InformationCircleIcon,
  Key01Icon,
  Loading03Icon,
  LockKeyIcon,
  Menu01Icon,
  Moon02Icon,
  PaintBoardIcon,
  PaintBrush01Icon,
  Refresh01Icon,
  RoboticIcon,
  Search01Icon,
  SourceCodeIcon,
  Sun03Icon,
  Tick02Icon,
  UnavailableIcon,
  UserIcon,
  BookOpenTextIcon,
  CodeFolderIcon,
  CreditCardNotAcceptIcon,
  FileCodeIcon,
  FileRemoveIcon,
  FingerPrintCheckIcon,
  LicenseIcon,
  PuzzleIcon,
  QuoteDownIcon,
  ShieldCheckIcon,
  SquareTerminalIcon,
  StoreVerified01Icon,
  SwatchIcon,
  UserCheck01Icon,
  WandSparklesIcon,
  WebValidationIcon,
} from "@hugeicons/core-free-icons";

// The site's icon set: Hugeicons (stroke rounded, free). Every icon goes through
// here so weight and sizing stay consistent. Size with CSS (`size-4`); the
// default stroke is a light 1.5, and the heaviest allowed is 2 for tiny icons.
type IconSvg = Parameters<typeof HugeiconsIcon>[0]["icon"];
export type IconProps = Omit<React.ComponentProps<"svg">, "ref" | "strokeWidth"> & { strokeWidth?: number };

function make(icon: IconSvg, name: string) {
  function Icon({ strokeWidth, className, ...props }: IconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        size="1em"
        strokeWidth={Math.min(strokeWidth ?? 1.5, 2)}
        className={className}
        aria-hidden={props["aria-label"] ? undefined : true}
        {...props}
      />
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const ArrowLeft = make(ArrowLeft01Icon, "ArrowLeft");
export const ArrowRight = make(ArrowRight01Icon, "ArrowRight");
export const ArrowUpRight = make(ArrowUpRight01Icon, "ArrowUpRight");
export const BadgeCheck = make(CheckmarkBadge01Icon, "BadgeCheck");
export const Ban = make(UnavailableIcon, "Ban");
export const Bot = make(RoboticIcon, "Bot");
export const Braces = make(SourceCodeIcon, "Braces");
export const Check = make(Tick02Icon, "Check");
export const CircleAlert = make(AlertCircleIcon, "CircleAlert");
export const CircleCheck = make(CheckmarkCircle02Icon, "CircleCheck");
export const CircleX = make(CancelCircleIcon, "CircleX");
export const Copy = make(Copy01Icon, "Copy");
export const CornerDownLeft = make(ArrowTurnBackwardIcon, "CornerDownLeft");
export const Download = make(Download04Icon, "Download");
export const FileText = make(File01Icon, "FileText");
export const Fingerprint = make(FingerPrintIcon, "Fingerprint");
export const Folder = make(Folder01Icon, "Folder");
export const GitCommitHorizontal = make(GitCommitIcon, "GitCommitHorizontal");
export const Hand = make(HandIcon, "Hand");
export const Hourglass = make(HourglassIcon, "Hourglass");
export const Image = make(Image01Icon, "Image");
export const Inbox = make(InboxIcon, "Inbox");
export const Info = make(InformationCircleIcon, "Info");
export const KeyRound = make(Key01Icon, "KeyRound");
export const LoaderCircle = make(Loading03Icon, "LoaderCircle");
export const LockKeyhole = make(LockKeyIcon, "LockKeyhole");
export const Menu = make(Menu01Icon, "Menu");
export const Monitor = make(ComputerIcon, "Monitor");
export const Moon = make(Moon02Icon, "Moon");
export const Paintbrush = make(PaintBrush01Icon, "Paintbrush");
export const Palette = make(PaintBoardIcon, "Palette");
export const Plus = make(Add01Icon, "Plus");
export const RotateCw = make(Refresh01Icon, "RotateCw");
export const Search = make(Search01Icon, "Search");
export const ShieldCheck = make(ShieldCheckIcon, "ShieldCheck");
export const Sun = make(Sun03Icon, "Sun");
export const Terminal = make(CommandLineIcon, "Terminal");
export const TriangleAlert = make(Alert02Icon, "TriangleAlert");
export const User = make(UserIcon, "User");
export const X = make(Cancel01Icon, "X");

// Section-specific glyphs, chosen for what each place means.
export const BookOpen = make(BookOpenTextIcon, "BookOpen");
export const CardBlocked = make(CreditCardNotAcceptIcon, "CardBlocked");
export const CodeFolder = make(CodeFolderIcon, "CodeFolder");
export const FileCode = make(FileCodeIcon, "FileCode");
export const FileRemove = make(FileRemoveIcon, "FileRemove");
export const FingerprintCheck = make(FingerPrintCheckIcon, "FingerprintCheck");
export const License = make(LicenseIcon, "License");
export const Puzzle = make(PuzzleIcon, "Puzzle");
export const Quote = make(QuoteDownIcon, "Quote");
export const SquareTerminal = make(SquareTerminalIcon, "SquareTerminal");
export const StoreVerified = make(StoreVerified01Icon, "StoreVerified");
export const Swatch = make(SwatchIcon, "Swatch");
export const UserCheck = make(UserCheck01Icon, "UserCheck");
export const WandSparkles = make(WandSparklesIcon, "WandSparkles");
export const WebValidation = make(WebValidationIcon, "WebValidation");

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
