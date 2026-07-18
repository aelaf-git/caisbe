"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavSectionData } from "@/components/layout/nav-types";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-6 w-6 text-caisbe-green"
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
}: {
  section: NavSectionData;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-ifma-border-light">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-semibold text-caisbe-green"
      >
        <Link href={section.href} onClick={(e) => e.stopPropagation()}>
          {section.label}
        </Link>
        <span className="text-ifma-muted">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="space-y-6 bg-white px-4 pb-4">
          {section.groups.map((group) => (
            <div key={group.title}>
              <Link
                href={group.href}
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-caisbe-red"
              >
                {group.title}
              </Link>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="block text-sm text-ifma-muted transition-colors hover:text-caisbe-green"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileNav({ sections }: { sections: NavSectionData[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded border border-caisbe-green p-2 text-caisbe-green transition-colors hover:bg-ifma-border-light"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        <MenuIcon open={mobileOpen} />
      </button>

      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full max-h-[80vh] overflow-y-auto border-t border-ifma-border-light bg-white shadow-lg">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
