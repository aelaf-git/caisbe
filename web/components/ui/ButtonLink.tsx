import Link from "next/link";

const variantStyles = {
  primary:
    "inline-flex min-w-[150px] items-center justify-center rounded-full bg-caisbe-red px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-caisbe-red-dark",
  secondary:
    "inline-flex min-w-[150px] items-center justify-center rounded-full border-2 border-caisbe-red bg-white px-7 py-3.5 text-sm font-bold text-caisbe-red transition hover:-translate-y-0.5 hover:bg-caisbe-red hover:text-white",
  green:
    "inline-flex items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-caisbe-red-dark hover:bg-caisbe-red-dark",
  red:
    "inline-flex items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-caisbe-red-dark hover:bg-caisbe-red-dark",
  text:
    "text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark",
  textGreen:
    "text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark",
  pill:
    "inline-flex items-center justify-center rounded-full bg-caisbe-red px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-caisbe-red-dark",
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
  const classNameFull = `${variantStyles[variant]} ${className}`;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} className={classNameFull}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classNameFull}>
      {children}
    </Link>
  );
}
