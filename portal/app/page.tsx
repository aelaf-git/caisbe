"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function PortalHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "admin") {
      router.replace("/login");
      return;
    }
    router.replace("/my-account");
  }, [loading, user, router]);

  return (
    <div className="px-4 py-16 text-center text-sm text-caisbe-muted">Loading portal…</div>
  );
}
