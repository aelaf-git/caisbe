import Link from "next/link";
import type { ReactNode } from "react";

export type IconActionName =
  | "edit"
  | "trash"
  | "view"
  | "open"
  | "download"
  | "publish"
  | "unpublish"
  | "archive"
  | "unarchive"
  | "pin"
  | "unpin"
  | "lock"
  | "unlock"
  | "suspend"
  | "activate"
  | "pay";

const baseStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden {...baseStroke}>
      {children}
    </svg>
  );
}

const ICONS: Record<IconActionName, ReactNode> = {
  edit: (
    <Svg>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  ),
  trash: (
    <Svg>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Svg>
  ),
  pay: (
    <Svg>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Svg>
  ),
  view: (
    <Svg>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  publish: (
    <Svg>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  unpublish: (
    <Svg>
      <path d="M17.9 17.9A10.1 10.1 0 0 1 12 19c-6.4 0-10-7-10-7a18.4 18.4 0 0 1 5.1-5.9" />
      <path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2" />
      <path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" />
      <path d="m2 2 20 20" />
    </Svg>
  ),
  open: (
    <Svg>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Svg>
  ),
  download: (
    <Svg>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Svg>
  ),
  archive: (
    <Svg>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </Svg>
  ),
  unarchive: (
    <Svg>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="m9.5 15 2.5-2.5 2.5 2.5" />
    </Svg>
  ),
  pin: (
    <Svg>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 7 3 3v2H7v-2l3-3Z" />
    </Svg>
  ),
  unpin: (
    <Svg>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 7 3 3v2H7v-2l3-3Z" />
      <path d="m3 3 18 18" />
    </Svg>
  ),
  lock: (
    <Svg>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  ),
  unlock: (
    <Svg>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </Svg>
  ),
  suspend: (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </Svg>
  ),
  activate: (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 3 3 5-6" />
    </Svg>
  ),
};

/** Bare glyph for use inside an already-labelled control. */
export function IconGlyph({ icon }: { icon: IconActionName }) {
  return <>{ICONS[icon]}</>;
}

type Tone = "neutral" | "danger" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "hover:bg-caisbe-green/10 hover:text-caisbe-green",
  brand: "hover:bg-caisbe-green/10 hover:text-caisbe-green",
  danger: "hover:bg-caisbe-red/10 hover:text-caisbe-red",
};

const baseClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-caisbe-muted transition-colors disabled:opacity-50";

type CommonProps = {
  icon: IconActionName;
  /** Tooltip and accessible name. */
  label: string;
  tone?: Tone;
  className?: string;
};

type ButtonProps = CommonProps & {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

/** Icon-only action button with tooltip and accessible name. */
export function IconActionButton({
  icon,
  label,
  tone = "neutral",
  className = "",
  onClick,
  disabled,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClass} ${TONES[tone]} ${className}`}
    >
      {ICONS[icon]}
    </button>
  );
}

type LinkProps = CommonProps & {
  href: string;
  /** Open in a new tab (external files, public pages). */
  external?: boolean;
  download?: boolean | string;
};

/** Icon-only link with tooltip and accessible name. */
export function IconActionLink({
  icon,
  label,
  tone = "neutral",
  className = "",
  href,
  external = false,
  download,
}: LinkProps) {
  const classes = `${baseClass} ${TONES[tone]} ${className}`;
  if (external || download) {
    return (
      <a
        href={href}
        title={label}
        aria-label={label}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        download={download}
        className={classes}
      >
        {ICONS[icon]}
      </a>
    );
  }
  return (
    <Link href={href} title={label} aria-label={label} className={classes}>
      {ICONS[icon]}
    </Link>
  );
}
