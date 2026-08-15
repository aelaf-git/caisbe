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
        <img
          src={LOGO_SRC}
          alt={`${siteFullName} logo`}
          width={2172}
          height={724}
          className="h-16 w-auto shrink-0 object-contain sm:h-20"
        />
        <div className="max-w-xl">
          <p className="text-lg font-bold tracking-wide text-white">
            {siteName}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white">
            {siteFullName}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/90">
            Advancing sustainable built environments across Canada and Africa
            through research, education, and collaboration.
          </p>
        </div>
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
