type BrandLogoProps = {
  /** Height utilities for the logo wrapper (e.g. `h-10 sm:h-12`). */
  className?: string;
  priority?: boolean;
  alt?: string;
  src: string;
  width?: number;
  height?: number;
};

/** CAISBE wordmark with ® at the top-right, sized as ~28% of logo height. */
export default function BrandLogo({
  className = "h-10",
  priority = false,
  alt = "CAISBE registered trademark logo",
  src,
  width,
  height,
}: BrandLogoProps) {
  return (
    <span
      className={`relative inline-flex aspect-[2172/724] shrink-0 [container-type:size] pr-[0.35em] ${className}`.trim()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
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
