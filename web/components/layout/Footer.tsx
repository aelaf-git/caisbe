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
        <div className="mb-10 flex flex-col gap-6 border-b border-white/20 pb-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-white/70">
              IFMA 45th Anniversary
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
              The world&apos;s largest and most widely recognized international
              association for facility management professionals.
            </p>
          </div>
          <div className="text-sm text-white/85">
            <p>+1-713-623-4362</p>
            <p>+1-800-963-6900</p>
          </div>
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
          <p>
            © 1980– International Facility Management Association (IFMA). All
            rights reserved
          </p>
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
