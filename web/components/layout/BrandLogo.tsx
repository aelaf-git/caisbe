type BrandLogoProps = {
  /**
   * Height + matching font-size so ® scales (0.28em of logo height).
   * Example: `h-10 text-[2.5rem]` or `h-16 text-[4rem] sm:h-20 sm:text-[5rem]`.
   */
  className?: string;
  priority?: boolean;
  alt?: string;
  src: string;
  width?: number;
  height?: number;
};

/** CAISBE wordmark with ® at the top-right of the mark, proportional to logo size. */
export default function BrandLogo({
  className = "h-10 text-[2.5rem]",
  priority = false,
  alt = "CAISBE registered trademark logo",
  src,
  width,
  height,
}: BrandLogoProps) {
  return (
    <span
      className={`relative inline-flex w-fit max-w-full shrink-0 leading-none ${className}`.trim()}
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
        className="pointer-events-none absolute top-0 left-full -translate-y-[22%] pl-[0.04em] font-serif text-[0.28em] font-bold leading-none text-caisbe-red"
      >
        ®
      </span>
    </span>
  );
}
