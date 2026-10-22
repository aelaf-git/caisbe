type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  alt?: string;
  src: string;
  width?: number;
  height?: number;
};

/** CAISBE wordmark logo. */
export default function BrandLogo({
  className = "h-10",
  priority = false,
  alt = "CAISBE logo",
  src,
  width,
  height,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex w-fit max-w-full shrink-0 leading-none ${className}`.trim()}>
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
    </span>
  );
}
