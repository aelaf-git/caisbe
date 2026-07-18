import Link from "next/link";
import Logo from "@/components/layout/Logo";
import { footerAddress, footerColumns } from "@/lib/data/home";

const socialLinks = [
  { label: "LinkedIn", href: "/social/linkedin" },
  { label: "X", href: "/social/x" },
  { label: "Facebook", href: "/social/facebook" },
  { label: "Instagram", href: "/social/instagram" },
  { label: "YouTube", href: "/social/youtube" },
];

export default function Footer() {
  return (
    <footer className="bg-caisbe-red text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 border-b border-white/25 pb-10">
          <Logo variant="footer" />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <Link
                href={column.href}
                className="mb-4 block text-sm font-bold uppercase tracking-wide text-white transition-colors hover:text-white/85"
              >
                {column.title}
              </Link>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm font-semibold text-white/95 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/25 pt-6">
          <p className="text-sm font-bold uppercase tracking-wide text-white">
            Contact Us
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white">
            {footerAddress}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/25 pt-6 text-sm font-semibold text-white md:flex-row md:items-center md:justify-between">
          <p>Copyright © 2026 caisbe.org</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-white/85"
            >
              Privacy Policy
            </Link>
            {socialLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white/85"
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
