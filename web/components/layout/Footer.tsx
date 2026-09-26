import Link from "next/link";
import Logo from "@/components/layout/Logo";
import {
  courseProgramPath,
  fetchPublishedCourses,
} from "@/lib/api";
import {
  footerAddress,
  footerColumns,
  type FooterColumn,
} from "@/lib/data/home";

type SocialLink = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const iconClass = "h-5 w-5";

const socialLinks: SocialLink[] = [
  {
    label: "LinkedIn",
    href: "/social/linkedin",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "/social/x",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.24 2H21.5l-7.19 8.22L22.75 22h-6.59l-5.16-6.75L5.1 22H1.83l7.69-8.79L1.25 2h6.76l4.66 6.18L18.24 2zm-1.16 18h1.81L7.01 3.89H5.07L17.08 20z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "/social/facebook",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M22.68 0H1.32A1.32 1.32 0 0 0 0 1.32v21.36A1.32 1.32 0 0 0 1.32 24h11.5v-9.29H9.69v-3.63h3.13V8.41c0-3.1 1.89-4.79 4.66-4.79 1.33 0 2.47.1 2.8.14v3.24h-1.92c-1.5 0-1.8.72-1.8 1.76v2.31h3.59l-.47 3.63h-3.12V24h6.11A1.32 1.32 0 0 0 24 22.68V1.32A1.32 1.32 0 0 0 22.68 0z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "/social/instagram",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95C23.73 2.7 21.31.27 16.95.07 15.67.01 15.26 0 12 0z" />
        <path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.17 6.17 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "/social/youtube",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.57V8.43L15.82 12l-6.07 3.57z" />
      </svg>
    ),
  },
];

export default async function Footer() {
  let columns: FooterColumn[] = footerColumns;
  try {
    const courses = await fetchPublishedCourses();
    if (courses.length > 0) {
      columns = footerColumns.map((column) => {
        if (column.title !== "Programs") return column;
        return {
          ...column,
          links: courses.map((course) => ({
            label: course.code || course.title,
            href: courseProgramPath(course.slug),
          })),
        };
      });
    }
  } catch {
    // Keep static Programs links.
  }

  return (
    <footer className="border-t-4 border-caisbe-red bg-[#111111] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 border-b border-white/25 pb-10">
          <Logo variant="footer" />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
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
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-white/85"
            >
              Privacy Policy
            </Link>
            <div className="flex items-center gap-3">
              {socialLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  title={link.label}
                  className="inline-flex text-white/95 transition-colors hover:text-white"
                >
                  {link.icon}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
