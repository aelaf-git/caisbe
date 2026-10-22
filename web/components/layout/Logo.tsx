import Link from "next/link";
import { siteFullName } from "@/lib/data/home";
import logoImage from "../../public/images/logo.png";
import BrandLogo from "./BrandLogo";

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
        <BrandLogo
          src={logoImage.src}
          width={logoImage.width}
          height={logoImage.height}
          alt={`${siteFullName} logo`}
          className="h-16 max-w-full sm:h-20 md:h-24"
        />
        <p className="text-base font-semibold leading-snug text-white sm:text-lg md:text-xl md:leading-7">
          {siteFullName}
        </p>
      </Link>
    );
  }

  return (
    <Link href="/" className="flex shrink-0 items-center pr-3">
      <BrandLogo
        src={logoImage.src}
        width={logoImage.width}
        height={logoImage.height}
        alt={`${siteFullName} logo`}
        className="h-10 sm:h-12"
        priority
      />
    </Link>
  );
}
