import Link from "next/link";
import { siteFullName } from "@/lib/data/home";
import logoImage from "../../public/images/logo.png";

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
          src={logoImage.src}
          alt={`${siteFullName} logo`}
          width={logoImage.width}
          height={logoImage.height}
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
        src={logoImage.src}
        alt={`${siteFullName} logo`}
        width={logoImage.width}
        height={logoImage.height}
        className="h-10 w-auto object-contain sm:h-12"
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  );
}
