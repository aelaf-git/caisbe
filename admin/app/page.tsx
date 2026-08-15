"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AdminHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/login");
      return;
    }
    router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
      Loading admin…
    </div>
  );
}
