import type { CSSProperties } from "react";

type BrandLogoProps = {
  /**
   * Height + matching font-size so ® scales (0.28em of logo height).
   * Example: `h-10 text-[2.5rem]` or `h-20 text-[5rem] sm:h-24 sm:text-[6rem]`.
   */
  className?: string;
  wrapperClassName?: string;
  style?: CSSProperties;
  priority?: boolean;
  alt?: string;
};

/** CAISBE wordmark with ® at the top-right of the mark, proportional to logo size. */
export default function BrandLogo({
  className = "h-10 text-[2.5rem]",
  wrapperClassName = "",
  style,
  priority = false,
  alt = "CAISBE registered trademark logo",
}: BrandLogoProps) {
  return (
    <span
      className={`relative inline-flex w-fit max-w-full shrink-0 leading-none ${className} ${wrapperClassName}`.trim()}
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
        className="pointer-events-none absolute top-0 left-full -translate-y-[22%] pl-[0.04em] font-serif text-[0.28em] font-bold leading-none text-caisbe-red"
      >
        ®
      </span>
    </span>
  );
}
