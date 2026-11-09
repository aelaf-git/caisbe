"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

export default function BackButton({
  href,
  label,
  className = "",
}: BackButtonProps) {
  const t = useT();
  label = label ?? t("Go back", "Retour");
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-sm font-semibold text-caisbe-text-dark transition-colors hover:text-caisbe-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caisbe-red/30 ${className}`}
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
