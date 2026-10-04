"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavSectionData } from "@/components/layout/nav-types";
import {
  portalMembershipLoginUrl,
  portalMembershipRegisterUrl,
} from "@/lib/api";

type UtilityLink = {
  label: string;
  href: string;
};

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-6 w-6 text-caisbe-text-dark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function MobileNavSection({
  section,
  isOpen,
  onToggle,
  onNavigate,
}: {
  section: NavSectionData;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="border-b border-ifma-border-light px-1 py-1 last:border-b-0">
      <div className="flex items-center gap-1">
        <Link
          href={section.href}
          onClick={onNavigate}
          className="min-w-0 flex-1 rounded-full px-4 py-3 text-left text-sm font-semibold text-caisbe-text-dark hover:bg-[#f8fafc]"
        >
          {section.label}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-caisbe-muted hover:bg-[#f8fafc] hover:text-caisbe-text-dark"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.label}`}
        >
          <span aria-hidden>{isOpen ? "−" : "+"}</span>
        </button>
      </div>
      {isOpen ? (
        <div className="mb-2 space-y-5 rounded-[20px] bg-[#f8fafc] px-4 py-4">
          {section.groups.map((group) => (
            <div key={group.title}>
              <Link
                href={group.href}
                onClick={onNavigate}
                className="font-hopewell-display mb-2 inline-flex rounded-full bg-caisbe-red/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-caisbe-red-dark"
              >
                {group.title}
              </Link>
              <ul className="space-y-1">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      className="block rounded-full px-3 py-1.5 text-sm text-caisbe-text transition-colors hover:bg-white hover:text-caisbe-red"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function MobileNav({
  sections,
  utilityLinks,
}: {
  sections: NavSectionData[];
  utilityLinks: UtilityLink[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const closeMenu = () => {
    setMobileOpen(false);
    setOpenSection(null);
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded-full border border-caisbe-red p-2 text-caisbe-red transition-colors hover:bg-caisbe-red/5"
        aria-expanded={mobileOpen}
        aria-controls="mobile-site-menu"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        <MenuIcon open={mobileOpen} />
      </button>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[60] bg-caisbe-text/25"
            onClick={closeMenu}
          />
          <div
            id="mobile-site-menu"
            className="font-hopewell absolute inset-x-0 top-full z-[70] max-h-[min(80vh,calc(100dvh-4.5rem))] overflow-y-auto border-t border-ifma-border-light bg-white shadow-hopewell"
          >
            <div className="space-y-1 px-3 py-3">
              {sections.map((section) => (
                <MobileNavSection
                  key={section.label}
                  section={section}
                  isOpen={openSection === section.label}
                  onToggle={() =>
                    setOpenSection((current) =>
                      current === section.label ? null : section.label,
                    )
                  }
                  onNavigate={closeMenu}
                />
              ))}
            </div>

            <div className="border-t border-ifma-border-light px-4 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-caisbe-muted">
                Quick links
              </p>
              <ul className="space-y-1">
                {utilityLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      className="block rounded-full px-3 py-2.5 text-sm font-medium text-caisbe-text hover:bg-[#f8fafc] hover:text-caisbe-red"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 border-t border-ifma-border-light px-4 py-4 sm:flex-row">
              <a
                href={portalMembershipLoginUrl()}
                onClick={closeMenu}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ifma-border text-sm font-semibold text-caisbe-text transition-colors hover:border-caisbe-red hover:text-caisbe-red"
              >
                Login
              </a>
              <a
                href={portalMembershipRegisterUrl()}
                onClick={closeMenu}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-caisbe-red text-sm font-bold text-white transition hover:bg-caisbe-red-dark"
              >
                Register
              </a>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
