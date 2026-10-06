import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export function buttonStyles({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "border-2 border-caisbe-red bg-caisbe-red text-white hover:border-caisbe-red-dark hover:bg-caisbe-red-dark focus-visible:ring-caisbe-red/25",
    secondary:
      "border-2 border-caisbe-red bg-admin-surface text-caisbe-red hover:bg-caisbe-red hover:text-white focus-visible:ring-caisbe-red/15",
    ghost:
      "text-caisbe-muted hover:bg-admin-surface-muted hover:text-caisbe-text focus-visible:ring-ifma-border",
    danger:
      "border-2 border-caisbe-red bg-caisbe-red text-white hover:border-caisbe-red-dark hover:bg-caisbe-red-dark focus-visible:ring-caisbe-red/25",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 gap-2 rounded-full px-4 text-xs",
    md: "h-11 gap-2 rounded-full px-6 text-sm",
  };

  return `inline-flex items-center justify-center font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
