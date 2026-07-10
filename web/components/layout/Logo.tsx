import Image from "next/image";
import { siteFullName, siteName } from "@/lib/data/home";

const LOGO_SRC = "/images/logo.webp";

type LogoProps = {
  variant?: "header" | "footer";
};

export default function Logo({ variant = "header" }: LogoProps) {
  if (variant === "footer") {
    return (
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0 rounded-full bg-white p-2 shadow-lg ring-1 ring-white/20">
          <Image
            src={LOGO_SRC}
            alt={`${siteFullName} logo`}
            width={112}
            height={112}
            className="h-24 w-24 object-contain sm:h-28 sm:w-28"
          />
        </div>
        <div className="max-w-xl">
          <p className="text-lg font-semibold tracking-wide text-white">
            {siteName}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/85">{siteFullName}</p>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Advancing sustainable built environments across Canada and Africa
            through research, education, and collaboration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <Image
        src={LOGO_SRC}
        alt={`${siteFullName} logo`}
        width={72}
        height={72}
        priority
        className="h-14 w-14 object-contain sm:h-16 sm:w-16"
      />
      <div className="hidden leading-tight md:block">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-ifma-navy">
          {siteName}
        </p>
        <p className="mt-0.5 max-w-[14rem] text-[11px] leading-snug text-ifma-muted lg:max-w-[18rem]">
          {siteFullName}
        </p>
      </div>
    </div>
  );
}
