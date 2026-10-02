"use client";

import { useState } from "react";
import type { SiteVisitDaily } from "@/lib/auth";

function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function VisitTrendChart({ points }: { points: SiteVisitDaily[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((point) => point.views));
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;

  const coords = points.map((point, index) => {
    const x = pad.left + (points.length === 1 ? innerW / 2 : index * step);
    const y = pad.top + innerH - (point.views / max) * innerH;
    return { x, y, point };
  });

  const line = coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`).join(" ");
  const area =
    coords.length > 0
      ? `${line} L ${coords[coords.length - 1].x} ${pad.top + innerH} L ${coords[0].x} ${pad.top + innerH} Z`
      : "";
  const active = hover != null ? coords[hover] : null;
  const ticks = coords.filter((_, index) => index === 0 || index === coords.length - 1 || index === Math.floor(coords.length / 2));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Daily page views">
        <line x1={pad.left} y1={pad.top + innerH} x2={width - pad.right} y2={pad.top + innerH} className="stroke-ifma-border" />
        {area ? <path d={area} className="fill-caisbe-red/15" /> : null}
        {line ? <path d={line} className="fill-none stroke-caisbe-red" strokeWidth="2.5" /> : null}
        {coords.map((coord, index) => (
          <circle
            key={coord.point.date}
            cx={coord.x}
            cy={coord.y}
            r={hover === index ? 5 : 3}
            className="fill-caisbe-red"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {ticks.map((coord) => (
          <text key={coord.point.date} x={coord.x} y={height - 6} textAnchor="middle" className="fill-caisbe-muted text-[11px]">
            {formatDay(coord.point.date)}
          </text>
        ))}
      </svg>
      {active ? (
        <div
          className="pointer-events-none absolute top-2 rounded-md border border-ifma-border bg-admin-surface px-3 py-2 text-xs shadow-brand-card"
          style={{ left: `${(active.x / width) * 100}%`, transform: "translateX(-50%)" }}
        >
          <p className="font-semibold text-caisbe-text-dark">{formatDay(active.point.date)}</p>
          <p className="mt-1 text-caisbe-muted">{active.point.views} views · {active.point.unique} unique</p>
        </div>
      ) : null}
    </div>
  );
}
