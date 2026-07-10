import Logo from "@/components/layout/Logo";
import { footerColumns } from "@/lib/data/home";

const socialLinks = [
  "LinkedIn",
  "X",
  "Facebook",
  "Instagram",
  "YouTube",
];

export default function Footer() {
  return (
    <footer className="bg-ifma-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 border-b border-white/20 pb-10">
          <Logo variant="footer" />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">
                {column.title}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <span className="cursor-default text-sm text-white/75 hover:text-white">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-6 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
          <p>Copyright © 2026 caisbe.org</p>
          <div className="flex flex-wrap gap-4">
            <span className="cursor-default hover:text-white">Privacy Policy</span>
            {socialLinks.map((link) => (
              <span key={link} className="cursor-default hover:text-white">
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
