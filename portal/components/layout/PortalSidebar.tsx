"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: "exact" },
  { href: "/courses", label: "My courses", match: "prefix" },
  { href: "/certificates", label: "Certificates", match: "prefix" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type PortalSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function PortalSidebar({ className = "", onNavigate }: PortalSidebarProps) {
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
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Student</p>
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
                  ? "bg-caisbe-red/10 font-semibold text-caisbe-red"
                  : "text-caisbe-muted hover:bg-ifma-border-light hover:text-caisbe-text"
              }`}
            >
              <span>{item.label}</span>
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
