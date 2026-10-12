"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import MyProgressSection from "@/components/portal/MyProgressSection";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError, type Enrollment } from "@/lib/auth";

export default function MyProgressPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void apiFetch<Enrollment[]>("/me/enrollments")
      .then((data) => {
        if (active) setEnrollments(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load progress.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning"
        title="My Progress"
        description="Course progress, learning, assignments, exam eligibility, outstanding requirements, and certificates."
      />
      {error ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-caisbe-muted">Loading progress…</p>
      ) : (
        <MyProgressSection enrollments={enrollments} showHeader={false} />
      )}
    </div>
  );
}
