import Link from "next/link";
import { siteFullName } from "@/lib/data/home";

const LOGO_SRC = "/images/logo.png";

type LogoProps = {
  variant?: "header" | "footer";
};

export default function Logo({ variant = "header" }: LogoProps) {
  if (variant === "footer") {
    return (
      <Link
        href="/"
        className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 text-center sm:gap-4"
      >
        <img
          src={LOGO_SRC}
          alt={`${siteFullName} logo`}
          width={2172}
          height={724}
          className="h-16 w-auto max-w-full object-contain sm:h-20 md:h-24"
        />
        <p className="text-base font-semibold leading-snug text-white sm:text-lg md:text-xl md:leading-7">
          {siteFullName}
        </p>
      </Link>
    );
  }

  return (
    <Link href="/" className="flex shrink-0 items-center">
      <img
        src={LOGO_SRC}
        alt={`${siteFullName} logo`}
        width={2172}
        height={724}
        className="h-10 w-auto object-contain sm:h-12"
      />
    </Link>
  );
}
