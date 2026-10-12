"use client";

import { portalMembershipLoginUrl, portalMembershipRegisterUrl, portalUrl } from "@/lib/api";
import { useStudentSession } from "@/components/auth/useStudentSession";

type AuthNavProps = {
  layout?: "bar" | "stack";
};

export default function AuthNav({ layout = "bar" }: AuthNavProps) {
  const { user, loading } = useStudentSession();
  const stack = layout === "stack";
  const row = stack ? "flex flex-col gap-2" : "flex items-center gap-4 leading-none";

  if (loading) {
    return <span className={`${stack ? "block h-11" : "inline-block h-8 w-16"}`} aria-hidden />;
  }

  if (!user) {
    return (
      <div className={row}>
        <a
          href={portalMembershipLoginUrl()}
          className={
            stack
              ? "inline-flex h-11 items-center justify-center rounded-full border border-ifma-border text-sm font-semibold text-caisbe-text transition-colors hover:border-caisbe-red hover:text-caisbe-red"
              : "inline-flex h-8 items-center font-medium text-caisbe-text transition-colors hover:text-caisbe-red"
          }
        >
          Login
        </a>
        <a
          href={portalMembershipRegisterUrl()}
          className="inline-flex h-9 items-center justify-center rounded-full bg-caisbe-red px-4 text-base font-bold text-white transition hover:bg-caisbe-red-dark"
        >
          Register
        </a>
      </div>
    );
  }

  return (
    <div className={row}>
      <span className={`truncate text-sm font-medium text-caisbe-text ${stack ? "" : "max-w-[10rem]"}`}>
        {user.full_name}
      </span>
      <a
        href={portalUrl("/dashboard")}
        className="inline-flex h-9 items-center justify-center rounded-full bg-caisbe-red px-4 text-sm font-bold text-white transition hover:bg-caisbe-red-dark"
      >
        myCAISBE
      </a>
      <a
        href={portalUrl("/logout")}
        onClick={(event) => {
          event.preventDefault();
          const next = encodeURIComponent(window.location.href);
          window.location.href = portalUrl(`/logout?next=${next}`);
        }}
        className={
          stack
            ? "inline-flex h-11 items-center justify-center rounded-full border border-ifma-border text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
            : "inline-flex h-8 items-center text-sm font-medium text-caisbe-text hover:text-caisbe-red"
        }
      >
        Log out
      </a>
    </div>
  );
}
