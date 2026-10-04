"use client";

import { getPasswordChecks, PASSWORD_REQUIREMENTS } from "@/lib/password";

function CriteriaTick({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 transition-colors ${
        ok ? "font-medium text-caisbe-text" : "text-caisbe-muted"
      }`}
    >
      <span
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          ok
            ? "border-caisbe-red bg-caisbe-red text-white"
            : "border-ifma-border bg-white text-transparent"
        }`}
        aria-hidden
      >
        <svg
          className="h-2.5 w-2.5"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 6.5 4.5 9 10 3" />
        </svg>
      </span>
      <span>{label}</span>
      <span className="sr-only">{ok ? "met" : "not met"}</span>
    </li>
  );
}

export default function PasswordCriteriaList({
  password,
  confirmPassword,
  mode = "rules",
  className = "",
}: {
  password: string;
  confirmPassword?: string;
  /** `rules` = strength checklist; `match` = confirm-password tick only */
  mode?: "rules" | "match";
  className?: string;
}) {
  const checks = getPasswordChecks(password);
  const passwordsMatch =
    Boolean(confirmPassword && confirmPassword.length > 0 && password === confirmPassword);

  return (
    <ul className={`space-y-2 rounded-md bg-[#f8fafc] px-4 py-3 text-xs ${className}`} aria-live="polite">
      {mode === "rules"
        ? PASSWORD_REQUIREMENTS.map((item) => (
            <CriteriaTick key={item.key} ok={checks[item.key]} label={item.label} />
          ))
        : (
            <CriteriaTick ok={passwordsMatch} label="Passwords match" />
          )}
    </ul>
  );
}
