import type { CSSProperties } from "react";

type BrandLogoProps = {
  className?: string;
  wrapperClassName?: string;
  style?: CSSProperties;
  priority?: boolean;
  alt?: string;
};

/** CAISBE wordmark with ® at the top-right. */
export default function BrandLogo({
  className = "h-10 w-auto object-contain",
  wrapperClassName = "",
  style,
  priority = false,
  alt = "CAISBE registered trademark logo",
}: BrandLogoProps) {
  return (
    <span className={`relative inline-flex shrink-0 pr-2 ${wrapperClassName}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt={alt}
        className={className}
        style={style}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-0.5 top-0 -translate-y-[20%] font-serif text-[0.62em] font-bold leading-none text-caisbe-red sm:-right-1 sm:text-[0.72em]"
      >
        ®
      </span>
    </span>
  );
}
