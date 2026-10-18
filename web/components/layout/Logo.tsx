import Link from "next/link";
import { siteFullName } from "@/lib/data/home";
import logoImage from "../../public/images/logo.png";

type LogoProps = {
  variant?: "header" | "footer";
};

function LogoMark({
  className,
  fetchPriority,
}: {
  className: string;
  fetchPriority?: "high" | "auto";
}) {
  return (
    <span className="relative inline-flex shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoImage.src}
        alt={`${siteFullName} registered trademark logo`}
        width={logoImage.width}
        height={logoImage.height}
        className={className}
        decoding="async"
        fetchPriority={fetchPriority}
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

export default function Logo({ variant = "header" }: LogoProps) {
  if (variant === "footer") {
    return (
      <Link
        href="/"
        className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 text-center sm:gap-4"
      >
        <LogoMark className="h-16 w-auto max-w-full object-contain sm:h-20 md:h-24" />
        <p className="text-base font-semibold leading-snug text-white sm:text-lg md:text-xl md:leading-7">
          {siteFullName}
          <span aria-hidden className="align-super text-[0.65em] text-caisbe-red">
            ®
          </span>
        </p>
      </Link>
    );
  }

  return (
    <Link href="/" className="flex shrink-0 items-center pr-2">
      <LogoMark
        className="h-10 w-auto object-contain sm:h-12"
        fetchPriority="high"
      />
    </Link>
  );
}
