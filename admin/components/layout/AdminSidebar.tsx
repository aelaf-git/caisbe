"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix" | "courses";
  soon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: "exact" },
  { href: "/courses", label: "All courses", match: "courses" },
  { href: "/courses/new", label: "Create course", match: "exact" },
  { href: "/students", label: "Students" },
  { href: "/enrollments", label: "Enrollments" },
  { href: "/media", label: "Media library", soon: true },
  { href: "/reports", label: "Reports", soon: true },
  { href: "/settings", label: "Settings", soon: true },
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-caisbe-green/10 font-semibold text-caisbe-green"
                  : "text-caisbe-muted hover:bg-ifma-border-light hover:text-caisbe-text"
              }`}
            >
              <span>{item.label}</span>
              {item.soon ? (
                <span className="rounded bg-ifma-border-light px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-caisbe-muted">
                  Soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-ifma-border-light px-5 py-4">
        <p className="truncate text-sm font-medium text-caisbe-text">{user?.full_name}</p>
        <p className="mt-0.5 truncate text-xs text-caisbe-muted">{user?.email}</p>
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
