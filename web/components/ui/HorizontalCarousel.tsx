"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

type HorizontalCarouselProps = {
  children: ReactNode;
  /** Accessible name for the region (section title). */
  label: string;
  className?: string;
  /** Tailwind width classes applied to each slide wrapper. */
  itemClassName?: string;
};

export default function HorizontalCarousel({
  children,
  label,
  className = "",
  itemClassName = "w-[min(85vw,22rem)] shrink-0 snap-start sm:w-[22rem]",
}: HorizontalCarouselProps) {
  const t = useT();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  function updateEdges() {
    const node = scrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setCanPrev(node.scrollLeft > 8);
    setCanNext(node.scrollLeft < max - 8);
  }

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return undefined;
    updateEdges();
    node.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [children]);

  function scrollByPage(direction: -1 | 1) {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.max(node.clientWidth * 0.8, 280);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={`relative ${className}`}>
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          disabled={!canPrev}
          aria-label={t("Previous", "Précédent")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ifma-border bg-white text-caisbe-text transition hover:border-caisbe-red hover:text-caisbe-red disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          disabled={!canNext}
          aria-label={t("Next", "Suivant")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ifma-border bg-white text-caisbe-text transition hover:border-caisbe-red hover:text-caisbe-red disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, index) => (
          <div key={index} className={itemClassName}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
