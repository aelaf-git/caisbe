import Link from "next/link";

export default function NavTextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`transition-colors hover:text-caisbe-green ${className}`}
    >
      {children}
    </Link>
  );
}
