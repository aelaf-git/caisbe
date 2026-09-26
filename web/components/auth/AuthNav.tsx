"use client";

import { useEffect, useId, useRef, useState } from "react";

const PORTAL_URL = (
  process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002"
).replace(/\/$/, "");
const ADMIN_URL = (
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

const loginLinks = [
  { label: "Student Login", href: `${PORTAL_URL}/login` },
  { label: "Member Login", href: `${PORTAL_URL}/login` },
  { label: "Admin Login", href: `${ADMIN_URL}/login` },
];

export default function AuthNav() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-4 leading-none">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 font-medium text-caisbe-text transition-colors hover:text-caisbe-red"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          Login
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-50 mt-2 min-w-[12.5rem] rounded-md border border-ifma-border bg-white py-2 shadow-brand-card"
          >
            {loginLinks.map((link) => (
              <a
                key={link.label}
                role="menuitem"
                href={link.href}
                className="block px-4 py-2.5 text-sm font-medium text-caisbe-text transition-colors hover:bg-[#fafafa] hover:text-caisbe-red"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <a
        href="/membership/become-a-member"
        className="inline-flex h-8 items-center font-semibold text-caisbe-red transition-colors hover:text-caisbe-red-dark"
      >
        Register
      </a>
    </div>
  );
}
