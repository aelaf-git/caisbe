import Image from "next/image";
import Link from "next/link";
import { siteFullName, siteName } from "@/lib/data/home";

const LOGO_SRC = "/images/logo.png";

type LogoProps = {
  variant?: "header" | "footer";
};

export default function Logo({ variant = "header" }: LogoProps) {
  if (variant === "footer") {
    return (
      <Link
        href="/"
        className="flex flex-col gap-5 sm:flex-row sm:items-center"
      >
        <Image
          src={LOGO_SRC}
          alt={`${siteFullName} logo`}
          width={112}
          height={112}
          sizes="(min-width: 640px) 112px, 96px"
          className="h-24 w-24 shrink-0 rounded-full object-contain sm:h-28 sm:w-28"
        />
        <div className="max-w-xl">
          <p className="text-lg font-semibold tracking-wide text-caisbe-green">
            {siteName}
          </p>
          <p className="mt-2 text-sm leading-6 text-caisbe-text">{siteFullName}</p>
          <p className="mt-2 text-sm leading-6 text-caisbe-muted">
            Advancing sustainable built environments across Canada and Africa
            through research, education, and collaboration.
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/" className="flex shrink-0 items-center gap-3">
      <Image
        src={LOGO_SRC}
        alt={`${siteFullName} logo`}
        width={72}
        height={72}
        sizes="(min-width: 640px) 64px, 56px"
        priority
        className="h-14 w-14 rounded-full object-contain sm:h-16 sm:w-16"
      />
      <div className="hidden leading-tight md:block">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-caisbe-green">
          {siteName}
        </p>
        <p className="mt-0.5 max-w-[14rem] text-[11px] leading-snug text-caisbe-muted lg:max-w-[18rem]">
          {siteFullName}
        </p>
      </div>
    </Link>
  );
}
