"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function CoursesSectionLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
        Loading admin…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="w-full shrink-0 md:w-56">
        <div className="border border-ifma-border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">CAISBE Admin</p>
          <p className="mt-1 text-sm text-caisbe-muted">{user.full_name}</p>
          <nav className="mt-6 space-y-2">
            <Link
              href="/courses"
              className={`block text-sm font-semibold ${
                pathname.startsWith("/courses") ? "text-caisbe-green" : "text-caisbe-text hover:text-caisbe-green"
              }`}
            >
              Courses
            </Link>
            <a href={SITE_URL} className="block text-sm text-caisbe-muted hover:text-caisbe-green">
              ← Website
            </a>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="block text-sm text-caisbe-muted hover:text-caisbe-red"
            >
              Logout
            </button>
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
