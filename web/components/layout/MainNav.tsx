"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { NavGroup, NavSection } from "@/lib/data/navigation";
import { mainNavigation } from "@/lib/data/navigation";

const VIEWPORT_PADDING = 16;
const PANEL_MAX_WIDTH = 720;

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

function getPanelWidth() {
  return Math.min(
    PANEL_MAX_WIDTH,
    window.innerWidth - VIEWPORT_PADDING * 2,
  );
}

function getPanelPosition(trigger: HTMLElement, panel: HTMLElement): PanelPosition {
  const triggerRect = trigger.getBoundingClientRect();
  const width = getPanelWidth();
  const panelHeight = panel.offsetHeight;

  let left =
    triggerRect.left + triggerRect.width / 2 - width / 2;
  const maxLeft = window.innerWidth - width - VIEWPORT_PADDING;
  left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

  let top = triggerRect.bottom;
  const maxTop = window.innerHeight - panelHeight - VIEWPORT_PADDING;
  if (top > maxTop) {
    top = Math.max(VIEWPORT_PADDING, maxTop);
  }

  return { top, left, width };
}

function DropdownPanel({
  groups,
  open,
  position,
  panelRef,
  onMouseEnter,
  onMouseLeave,
}: {
  groups: NavGroup[];
  open: boolean;
  position: PanelPosition | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted || !position) {
    return null;
  }

  const gridClass =
    groups.length >= 3
      ? "grid-cols-1 sm:grid-cols-3"
      : groups.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1";

  return createPortal(
    <div
      ref={panelRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
      }}
      className="z-[100] max-h-[calc(100vh-5rem)] overflow-x-hidden overflow-y-auto border border-ifma-border-light bg-white py-6 shadow-lg"
    >
      <div className={`grid gap-6 px-5 ${gridClass}`}>
        {groups.map((group) => (
          <div key={group.title} className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-green">
              {group.title}
            </p>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="block text-sm leading-5 break-words text-ifma-text-dark transition-colors hover:text-caisbe-red"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function DesktopNavItem({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) {
      return;
    }

    if (panel) {
      setPosition(getPanelPosition(trigger, panel));
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const width = getPanelWidth();
    let left = triggerRect.left + triggerRect.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - VIEWPORT_PADDING;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

    setPosition({
      top: triggerRect.bottom,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updatePanelPosition();
    const raf = window.requestAnimationFrame(updatePanelPosition);

    const handleReposition = () => updatePanelPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePanelPosition, section.groups]);

  const handleOpen = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePanelPosition();
    setOpen(true);
  };

  const handleClose = () => {
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      setPosition(null);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <li className="relative">
      <div
        ref={triggerRef}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        className={`flex items-center gap-1 border-b-2 px-3 py-5 text-[14px] font-medium transition-colors ${
          open
            ? "border-caisbe-green text-caisbe-green"
            : "border-transparent text-ifma-text-dark hover:border-caisbe-green hover:text-caisbe-green"
        }`}
      >
        <Link href={section.href}>{section.label}</Link>
        <svg
          className="h-3 w-3 opacity-60"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </div>
      <DropdownPanel
        groups={section.groups}
        open={open}
        position={position}
        panelRef={panelRef}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      />
    </li>
  );
}

function MobileNavSection({
  section,
  isOpen,
  onToggle,
}: {
  section: NavSection;
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

export default function MainNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <>
      <nav className="hidden overflow-visible lg:block">
        <ul className="flex items-center overflow-visible">
          {mainNavigation.map((section) => (
            <DesktopNavItem key={section.label} section={section} />
          ))}
        </ul>
      </nav>

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
            {mainNavigation.map((section) => (
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
    </>
  );
}
