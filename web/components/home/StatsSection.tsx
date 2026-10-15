"use client";

import { useEffect, useRef, useState } from "react";
import { stats } from "@/lib/data/home";

const COUNT_DURATION_MS = 1800;
const NUMBER_PATTERN = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Splits "1520+" into prefix, numeric value and suffix; returns null for non-numeric text. */
function parseStat(raw: string) {
  const match = NUMBER_PATTERN.exec(raw.trim());
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
  return {
    prefix,
    suffix,
    decimals,
    grouped: digits.includes(","),
    target: Number(digits.replace(/,/g, "")),
  };
}

function CountUp({ value, delayMs }: { value: string; delayMs: number }) {
  const parsed = parseStat(value);
  const ref = useRef<HTMLParagraphElement>(null);
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !parsed) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let frame = 0;
    let timer = 0;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / COUNT_DURATION_MS, 1);
        setCurrent(parsed.target * easeOutCubic(progress));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setCurrent(0);
        timer = window.setTimeout(run, delayMs);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  if (!parsed) return <p ref={ref} className={numberClass}>{value}</p>;

  const shown = current ?? parsed.target;
  const text = shown.toLocaleString("en-US", {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
    useGrouping: parsed.grouped,
  });

  return (
    <p ref={ref} className={numberClass} aria-label={value}>
      <span aria-hidden>
        {parsed.prefix}
        {text}
        {parsed.suffix}
      </span>
    </p>
  );
}

const numberClass =
  "font-sans text-3xl font-bold leading-none tracking-normal text-caisbe-red tabular-nums md:text-[2.5rem]";

export default function StatsSection({
  items,
}: {
  items?: { value: string; label: string }[];
}) {
  const shown = items?.length ? items : stats;
  return (
    <section className="border-b border-ifma-border-light bg-[#f7f9fa]">
      <div className="mx-auto grid max-w-[90rem] grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-10 lg:py-14">
        {shown.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="text-center motion-safe:animate-page-fade-in"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <CountUp value={item.value} delayMs={index * 150} />
            <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-5 text-caisbe-muted">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
