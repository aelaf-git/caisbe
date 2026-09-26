"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch } from "@/lib/auth";
import type { Cart } from "@/lib/commerce";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match?: "exact" | "prefix";
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "grid", match: "exact" }],
  },
  {
    label: "Learning",
    items: [
      { href: "/courses", label: "My courses", icon: "book", match: "prefix" },
      { href: "/cart", label: "Cart", icon: "cart", match: "exact" },
      { href: "/certificates", label: "Certificates", icon: "award", match: "prefix" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/account", label: "Manage profile", icon: "user", match: "prefix" }],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M2 2h3l2.4 12.2a2 2 0 0 0 2 1.8h7.6a2 2 0 0 0 2-1.6L21 7H6" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.12" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

type PortalSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function PortalSidebar({ className = "", onNavigate }: PortalSidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [certsReady, setCertsReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<{ id: number }[]>("/me/certificates")
      .then((rows) => {
        if (active) setCertsReady(rows.length > 0);
      })
      .catch(() => {
        if (active) setCertsReady(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    void apiFetch<Cart>("/me/cart")
      .then((cart) => {
        if (active) setCartCount(cart.count);
      })
      .catch(() => {
        if (active) setCartCount(0);
      });
    return () => {
      active = false;
    };
  }, [user?.id, pathname]);

  return (
    <aside className={`flex h-full w-full flex-col border-r border-ifma-border bg-admin-surface ${className}`}>
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

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-caisbe-muted/70">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const certsInactive = item.href === "/certificates" && !certsReady;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      certsInactive
                        ? "cursor-default text-caisbe-muted/50"
                        : active
                          ? "bg-caisbe-red/10 font-semibold text-caisbe-red"
                          : "text-caisbe-muted hover:bg-ifma-border-light hover:text-caisbe-text"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <NavIcon name={item.icon} />
                      <span className="truncate">
                        {item.label}
                        {certsInactive ? " (inactive)" : ""}
                      </span>
                    </span>
                    {item.href === "/cart" && cartCount > 0 ? (
                      <span className="rounded-full bg-caisbe-red px-2 py-0.5 text-xs font-semibold text-white">
                        {cartCount}
                      </span>
                    ) : null}
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
            {user?.full_name?.charAt(0).toUpperCase() || "S"}
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
          className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-ifma-border px-3 py-2 text-sm font-medium text-caisbe-muted transition-colors hover:border-caisbe-red hover:text-caisbe-red"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
