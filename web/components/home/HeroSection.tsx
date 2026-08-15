"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { heroCta, heroIntro, siteFullName, siteName } from "@/lib/data/home";

const HERO_IMAGES = [
  { src: "/images/hero_1.jpeg", alt: "CAISBE campus and learning community" },
  { src: "/images/hero_2.jpeg", alt: "CAISBE students and professionals" },
  { src: "/images/hero_3.jpeg", alt: "CAISBE built environment education" },
] as const;

export default function HeroSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return undefined;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[32rem] overflow-hidden border-b border-ifma-border-light md:min-h-[40rem] lg:min-h-[44rem]">
      {HERO_IMAGES.map((image, imageIndex) => (
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          fill
          priority={imageIndex === 0}
          sizes="100vw"
          className={`object-cover object-center transition-opacity duration-700 ${
            imageIndex === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/55 to-caisbe-red/25" />

      <div className="relative z-10 mx-auto flex min-h-[32rem] max-w-7xl flex-col justify-center px-4 py-16 md:min-h-[40rem] md:py-24 lg:min-h-[44rem]">
        <div className="max-w-4xl border-l-4 border-caisbe-red pl-6 md:pl-8">
          <h1 className="text-[clamp(1.75rem,3.5vw,3.25rem)] font-semibold leading-tight text-white">
            {siteFullName}
          </h1>
          <p className="mt-6 max-w-3xl text-[clamp(1rem,2vw,1.125rem)] leading-relaxed text-white/90">
            {heroIntro}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/75">
            {heroCta}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-4 pl-6 md:pl-8">
          <ButtonLink href="/membership/join" variant="primary">
            Join {siteName}
          </ButtonLink>
          <ButtonLink href="/our-services" variant="secondary">
            Our Services
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact Us
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
