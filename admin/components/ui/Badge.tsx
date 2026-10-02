import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export default function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-admin-surface-muted text-caisbe-muted",
    brand: "bg-caisbe-red/10 text-caisbe-red",
    success: "bg-admin-success-soft text-admin-success",
    warning: "bg-admin-warning-soft text-admin-warning",
    info: "bg-admin-info-soft text-admin-info",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
