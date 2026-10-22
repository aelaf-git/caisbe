import type { CSSProperties } from "react";

type BrandLogoProps = {
  className?: string;
  wrapperClassName?: string;
  style?: CSSProperties;
  priority?: boolean;
  alt?: string;
};

/** CAISBE wordmark logo. */
export default function BrandLogo({
  className = "h-10",
  wrapperClassName = "",
  style,
  priority = false,
  alt = "CAISBE logo",
}: BrandLogoProps) {
  return (
    <span
      className={`inline-flex w-fit max-w-full shrink-0 leading-none ${className} ${wrapperClassName}`.trim()}
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
    </span>
  );
}
