"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeReturnTarget, siteUrl } from "@/lib/membershipApplication";

function LogoutInner() {
  const { logout } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = safeReturnTarget(searchParams.get("next"), siteUrl("/"));
    let active = true;
    void logout().then(() => {
      if (active) window.location.replace(next);
    });
    return () => {
      active = false;
    };
  }, [logout, searchParams]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
      Signing out…
    </div>
  );
}

export default function LogoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
          Signing out…
        </div>
      }
    >
      <LogoutInner />
    </Suspense>
  );
}
