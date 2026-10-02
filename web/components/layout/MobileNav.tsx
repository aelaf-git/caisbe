"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavSectionData } from "@/components/layout/nav-types";

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
    <div className="px-3 py-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-semibold text-caisbe-text-dark hover:bg-[#f8fafc]"
      >
        <Link
          href={section.href}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
        >
          {section.label}
        </Link>
        <span className="text-caisbe-muted">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="mt-1 space-y-5 rounded-[20px] bg-[#f8fafc] px-4 py-4">
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
        className="inline-flex items-center justify-center rounded-full border border-caisbe-red p-2 text-caisbe-red transition-colors hover:bg-caisbe-red/5"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        <MenuIcon open={mobileOpen} />
      </button>

      {mobileOpen && (
        <div className="font-hopewell absolute left-3 right-3 top-full max-h-[80vh] overflow-y-auto rounded-[20px] bg-white py-2 shadow-hopewell">
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
              onNavigate={() => {
                setMobileOpen(false);
                setOpenSection(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
