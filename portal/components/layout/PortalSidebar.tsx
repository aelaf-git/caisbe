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
      { href: "/membership", label: "Membership", icon: "badge", match: "prefix" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/notifications", label: "Notifications", icon: "bell", match: "prefix" },
      { href: "/account", label: "Manage profile", icon: "user", match: "prefix" },
    ],
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
    badge: (
      <>
        <path d="M12 3 14.5 8.5 20.5 9.5 16 13.5 17.2 19.5 12 16.8 6.8 19.5 8 13.5 3.5 9.5 9.5 8.5Z" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    bell: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
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
  const [cartCount, setCartCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<Cart>("/me/cart")
      .then((cart) => {
        if (active) setCartCount(cart.count);
      })
      .catch(() => {
        if (active) setCartCount(0);
      });
    void apiFetch<{ unread_count: number }>("/me/notifications")
      .then((data) => {
        if (active) setUnreadNotifications(data.unread_count);
      })
      .catch(() => {
        if (active) setUnreadNotifications(0);
      });
    return () => {
      active = false;
    };
  }, [user?.id, pathname]);

  return (
    <aside className={`flex h-full w-full flex-col bg-admin-surface shadow-hopewell-nav ${className}`}>
      <div className="px-5 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex flex-col gap-2">
          <Image
            src="/images/logo.png"
            alt="CAISBE logo"
            width={2172}
            height={724}
            priority
            className="h-10 w-auto max-w-full object-contain"
          />
          <p className="inline-flex w-fit rounded-full bg-caisbe-red/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-caisbe-red-dark">
            Student
          </p>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="font-hopewell-display mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-caisbe-muted/70">
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
                    className={`flex items-center justify-between gap-2 rounded-full px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-caisbe-red font-semibold text-white"
                        : "text-caisbe-muted hover:bg-admin-surface-muted hover:text-caisbe-text"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <NavIcon name={item.icon} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.href === "/cart" && cartCount > 0 ? (
                      <span className="rounded-full bg-caisbe-red px-2 py-0.5 text-xs font-semibold text-white">
                        {cartCount}
                      </span>
                    ) : null}
                    {item.href === "/notifications" && unreadNotifications > 0 ? (
                      <span className="rounded-full bg-caisbe-red px-2 py-0.5 text-xs font-semibold text-white">
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto px-5 py-4">
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
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border-2 border-caisbe-red px-4 py-2 text-sm font-bold text-caisbe-red transition hover:bg-caisbe-red hover:text-white"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
