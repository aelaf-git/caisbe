import type { CSSProperties } from "react";

type BrandLogoProps = {
  /** Height utilities for the logo wrapper (e.g. `h-10 sm:h-12`). */
  className?: string;
  wrapperClassName?: string;
  /** Applied to the wrapper so ® scales with height (e.g. certificates). */
  style?: CSSProperties;
  priority?: boolean;
  alt?: string;
};

/** CAISBE wordmark with ® at the top-right, sized as ~28% of logo height. */
export default function BrandLogo({
  className = "h-10",
  wrapperClassName = "",
  style,
  priority = false,
  alt = "CAISBE registered trademark logo",
}: BrandLogoProps) {
  return (
    <span
      className={`relative inline-flex aspect-[2172/724] shrink-0 [container-type:size] pr-[0.35em] ${className} ${wrapperClassName}`.trim()}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt={alt}
        className="h-full w-auto max-w-full object-contain"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 translate-x-[15%] -translate-y-[20%] font-serif text-[length:28cqh] font-bold leading-none text-caisbe-red"
      >
        ®
      </span>
    </span>
  );
}
