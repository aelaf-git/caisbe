import Link from "next/link";
import Logo from "@/components/layout/Logo";
import { footerColumns } from "@/lib/data/home";

const socialLinks = [
  { label: "LinkedIn", href: "/social/linkedin" },
  { label: "X", href: "/social/x" },
  { label: "Facebook", href: "/social/facebook" },
  { label: "Instagram", href: "/social/instagram" },
  { label: "YouTube", href: "/social/youtube" },
];

export default function Footer() {
  return (
    <footer className="border-t-4 border-caisbe-red bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 border-b border-ifma-border-light pb-10">
          <Logo variant="footer" />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <Link
                href={column.href}
                className="mb-4 block text-sm font-semibold uppercase tracking-wide text-caisbe-green transition-colors hover:text-caisbe-red"
              >
                {column.title}
              </Link>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-caisbe-muted transition-colors hover:text-caisbe-red"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-ifma-border-light pt-6 text-sm text-caisbe-muted md:flex-row md:items-center md:justify-between">
          <p>Copyright © 2026 caisbe.org</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-caisbe-green"
            >
              Privacy Policy
            </Link>
            {socialLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-caisbe-green"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
