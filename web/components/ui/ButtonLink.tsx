import Link from "next/link";

const variantStyles = {
  primary:
    "inline-flex min-w-[150px] items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-red-dark",
  secondary:
    "inline-flex min-w-[150px] items-center justify-center border-2 border-caisbe-green bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-caisbe-green transition-colors hover:text-caisbe-red",
  green:
    "inline-flex items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-green-mid",
  red:
    "inline-flex items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-red-dark",
  text:
    "text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-green",
  textGreen:
    "text-sm font-semibold uppercase tracking-wide text-caisbe-green transition-colors hover:text-caisbe-red",
};

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof variantStyles;
  className?: string;
};

export default function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonLinkProps) {
  return (
    <Link href={href} className={`${variantStyles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
