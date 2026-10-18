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
          alt={`${siteFullName} registered trademark logo`}
          className="h-16 max-w-full text-[4rem] sm:h-20 sm:text-[5rem] md:h-24 md:text-[6rem]"
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
        alt={`${siteFullName} registered trademark logo`}
        className="h-10 text-[2.5rem] sm:h-12 sm:text-[3rem]"
        priority
      />
    </Link>
  );
}
