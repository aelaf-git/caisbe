"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match?: "exact" | "prefix" | "courses";
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "grid", match: "exact" }],
  },
  {
    label: "Learning",
    items: [
      { href: "/courses", label: "Courses", icon: "book", match: "courses" },
      { href: "/students", label: "Students", icon: "users" },
      { href: "/enrollments", label: "Enrollments", icon: "layers" },
      { href: "/certificates", label: "Certificates", icon: "award" },
    ],
  },
  {
    label: "Publishing",
    items: [
      { href: "/media", label: "Media library", icon: "image" },
      { href: "/site-activity", label: "Site activity", icon: "activity" },
      { href: "/reports", label: "Reports", icon: "chart" },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  if (item.match === "courses") {
    return pathname === "/courses" || /^\/courses\/(?!new$)[^/]+$/.test(pathname);
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type AdminSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    layers: <><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 12 10 5 10-5M2 17l10 5 10-5" /></>,
    award: <><circle cx="12" cy="8" r="6" /><path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.12" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    activity: <path d="M3 12h4l3-9 4 18 3-9h4" />,
    chart: <><path d="M3 3v18h18" /><path d="m7 16 4-5 4 3 5-7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.6.65 1.02 1.26 1H21v4h-.34c-.61 0-1.14.42-1.26 1Z" /></>,
  };
  return <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function AdminSidebar({ className = "", onNavigate }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className={`flex h-full w-full flex-col border-r border-ifma-border bg-white ${className}`}>
      <div className="border-b border-ifma-border-light px-5 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex flex-col gap-2">
          <Image
            src="/images/logo.png"
            alt="CAISBE logo"
            width={2172}
            height={724}
            priority
            className="h-10 w-auto max-w-full object-contain"
          />
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Admin</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-caisbe-muted/70">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-caisbe-red/10 font-semibold text-caisbe-red"
                        : "text-caisbe-muted hover:bg-ifma-border-light hover:text-caisbe-text"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-ifma-border-light px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-caisbe-red text-sm font-bold text-white">
            {user?.full_name?.charAt(0).toUpperCase() || "A"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-caisbe-text">{user?.full_name}</p>
            <p className="truncate text-xs text-caisbe-muted">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="mt-3 inline-flex items-center justify-center rounded-md border border-ifma-border px-3 py-2 text-sm font-medium text-caisbe-muted transition-colors hover:border-caisbe-red hover:text-caisbe-red"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
