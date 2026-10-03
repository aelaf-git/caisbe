"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import PortalSidebar from "@/components/layout/PortalSidebar";

function isImmersiveCoursePath(pathname: string | null) {
  // /courses/123 only — not the catalog or checkout
  return Boolean(pathname && /^\/courses\/\d+$/.test(pathname));
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const immersive = isImmersiveCoursePath(pathname);

  useEffect(() => {
    if (!loading && (!user || user.role === "admin")) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading || !user || user.role === "admin") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
        Loading portal…
      </div>
    );
  }

  if (immersive) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col bg-admin-canvas">
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-caisbe-text/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] transition-transform duration-200 print:hidden md:sticky md:top-0 md:z-0 md:h-screen md:w-64 md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <PortalSidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-admin-surface px-4 py-3 shadow-hopewell-nav print:hidden md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-caisbe-red text-caisbe-red"
            aria-label="Open navigation"
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-caisbe-red">CAISBE Student</p>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 print:p-0 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
