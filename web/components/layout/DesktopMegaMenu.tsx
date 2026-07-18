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
import type { NavGroupData, NavSectionData } from "@/components/layout/nav-types";

const VIEWPORT_PADDING = 16;
const PANEL_MAX_WIDTH = 720;
const PANEL_OVERLAP = 6;

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

function getPanelWidth() {
  return Math.min(PANEL_MAX_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
}

function getPanelPosition(
  trigger: HTMLElement,
  panel: HTMLElement,
): PanelPosition {
  const triggerRect = trigger.getBoundingClientRect();
  const width = getPanelWidth();
  const panelHeight = panel.offsetHeight;

  let left = triggerRect.left + triggerRect.width / 2 - width / 2;
  const maxLeft = window.innerWidth - width - VIEWPORT_PADDING;
  left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

  let top = triggerRect.bottom - PANEL_OVERLAP;
  const maxTop = window.innerHeight - panelHeight - VIEWPORT_PADDING;
  if (top > maxTop) {
    top = Math.max(VIEWPORT_PADDING, maxTop);
  }

  return { top, left, width };
}

function isNodeIn(target: EventTarget | null, container: HTMLElement | null) {
  return Boolean(
    target instanceof Node && container && container.contains(target),
  );
}

function DropdownPanel({
  groups,
  open,
  position,
  panelRef,
  onMouseEnter,
  onMouseLeave,
}: {
  groups: NavGroupData[];
  open: boolean;
  position: PanelPosition | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: (event: React.MouseEvent) => void;
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

function DesktopNavItem({
  section,
  isOpen,
  onOpen,
  onClose,
}: {
  section: NavSectionData;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const closeNow = useCallback(() => {
    clearCloseTimeout();
    onClose();
  }, [onClose]);

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
      top: triggerRect.bottom - PANEL_OVERLAP,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
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
  }, [isOpen, updatePanelPosition, section.groups]);

  useEffect(() => {
    return () => clearCloseTimeout();
  }, []);

  const handleTriggerEnter = () => {
    clearCloseTimeout();
    updatePanelPosition();
    onOpen();
  };

  const handleTriggerLeave = (event: React.MouseEvent) => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const leavingDownward =
      triggerRect != null && event.clientY >= triggerRect.bottom - 4;

    if (leavingDownward) {
      if (isNodeIn(event.relatedTarget, panelRef.current)) {
        return;
      }

      clearCloseTimeout();
      closeTimeoutRef.current = window.setTimeout(() => {
        const overTrigger = triggerRef.current?.matches(":hover");
        const overPanel = panelRef.current?.matches(":hover");
        if (!overTrigger && !overPanel) {
          onClose();
        }
        closeTimeoutRef.current = null;
      }, 80);
      return;
    }

    closeNow();
  };

  const handlePanelEnter = () => {
    clearCloseTimeout();
    onOpen();
  };

  const handlePanelLeave = (event: React.MouseEvent) => {
    if (isNodeIn(event.relatedTarget, triggerRef.current)) {
      return;
    }
    closeNow();
  };

  return (
    <li className="relative">
      <div
        ref={triggerRef}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        className={`flex items-center gap-1 border-b-2 px-3 py-5 text-[14px] font-medium transition-colors ${
          isOpen
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
        open={isOpen}
        position={position}
        panelRef={panelRef}
        onMouseEnter={handlePanelEnter}
        onMouseLeave={handlePanelLeave}
      />
    </li>
  );
}

export default function DesktopMegaMenu({
  sections,
}: {
  sections: NavSectionData[];
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <nav className="hidden overflow-visible lg:block">
      <ul className="flex items-center overflow-visible">
        {sections.map((section) => (
          <DesktopNavItem
            key={section.label}
            section={section}
            isOpen={openSection === section.label}
            onOpen={() => setOpenSection(section.label)}
            onClose={() =>
              setOpenSection((current) =>
                current === section.label ? null : current,
              )
            }
          />
        ))}
      </ul>
    </nav>
  );
}
