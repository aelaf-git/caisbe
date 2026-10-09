"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import MembershipApplicationForm from "@/components/membership/MembershipApplicationForm";
import { safeNextPath } from "@/lib/membershipApplication";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const nextPath = safeNextPath(searchParams.get("next"), "/membership");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        router.replace("/login");
        return;
      }
      router.replace(nextPath);
    }
  }, [loading, user, router, nextPath]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
        Loading…
      </div>
    );
  }

  return (
    <section className="grid min-h-screen flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="relative min-h-[220px] overflow-hidden sm:min-h-[280px] lg:sticky lg:top-0 lg:h-screen">
        <Image
          src="/images/student_register.jpeg"
          alt="Students collaborating around a study table"
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-caisbe-red/20 to-black/10 lg:bg-linear-to-r lg:from-black/20 lg:via-transparent lg:to-caisbe-red/35" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">myCAISBE</p>
          <p className="font-hopewell-display mt-2 max-w-md text-2xl font-extrabold text-white sm:text-3xl">
            Create your myCAISBE account and start learning
          </p>
        </div>
      </div>

      <div className="bg-admin-canvas px-4 py-10 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-3xl">
          <Image
            src="/images/logo.png"
            alt="CAISBE logo"
            width={2172}
            height={724}
            priority
            className="h-16 w-auto object-contain sm:h-20"
          />
          {pendingEmail ? (
            <div className="mt-8 rounded-md border border-ifma-border bg-admin-surface p-6 shadow-brand-card">
              <h1 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">
                Check your email
              </h1>
              <p className="mt-3 text-sm leading-6 text-caisbe-muted">
                We sent a verification link to{" "}
                <span className="font-semibold text-caisbe-text-dark">{pendingEmail}</span>. Open that
                link to verify your email and open your account. The link expires in 72 hours.
              </p>
              <p className="mt-4 text-sm text-caisbe-muted">
                Already verified?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="font-semibold text-caisbe-red hover:text-caisbe-red-dark"
                >
                  Login
                </Link>
              </p>
            </div>
          ) : (
            <>
              <p className="mt-6 text-sm text-caisbe-muted">
                Submitting this form starts your signup. Your account opens only after you verify your
                email. Student membership includes a free certificate; paid types unlock after checkout
                on Membership.
              </p>
              <div className="mt-6">
                <MembershipApplicationForm
                  kind="application"
                  variant="register"
                  onPendingVerification={(email) => setPendingEmail(email)}
                />
              </div>
              <p className="mt-6 text-sm text-caisbe-muted">
                Already have an account?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="font-semibold text-caisbe-red hover:text-caisbe-red-dark"
                >
                  Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
          Loading…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
