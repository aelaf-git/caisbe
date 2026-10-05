"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch, ApiError, setToken, type TokenResponse } from "@/lib/auth";
import { safeNextPath } from "@/lib/membershipApplication";

function VerifyEmailHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const nextPath = safeNextPath(searchParams.get("next"), "/membership");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This verification link is missing or incomplete.");
      return;
    }

    let cancelled = false;
    async function redeem() {
      try {
        const data = await apiFetch<TokenResponse>("/auth/verify-email", {
          method: "POST",
          auth: false,
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        setToken(data.access_token);
        window.location.assign(nextPath);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.detail
            : "This verification link is invalid or has expired.",
        );
      }
    }
    void redeem();
    return () => {
      cancelled = true;
    };
  }, [token, nextPath, router]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
        <h1 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">
          Unable to verify your email
        </h1>
        <p className="mt-3 text-sm leading-6 text-caisbe-muted">{error}</p>
        <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-caisbe-text">
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-caisbe-red hover:text-caisbe-red-dark"
          >
            Register again
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-caisbe-red hover:text-caisbe-red-dark"
          >
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
      Verifying your email…
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
          Verifying your email…
        </div>
      }
    >
      <VerifyEmailHandler />
    </Suspense>
  );
}
