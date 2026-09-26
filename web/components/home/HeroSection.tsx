"use client";

import { useEffect, useRef, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { fetchHeroCarousel, type HeroSlide } from "@/lib/api";
import { heroIntro, siteFullName, siteName } from "@/lib/data/home";

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "default-1",
    title: "CAISBE campus and learning community",
    file_url: "/images/hero_1.jpeg",
    media_type: "image",
  },
  {
    id: "default-2",
    title: "CAISBE students and professionals",
    file_url: "/images/hero_2.jpeg",
    media_type: "image",
  },
  {
    id: "default-3",
    title: "CAISBE built environment education",
    file_url: "/images/hero_3.jpeg",
    media_type: "image",
  },
];

const DEFAULT_TRANSITION_MS = 3000;

export default function HeroSection() {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_SLIDES);
  const [transitionMs, setTransitionMs] = useState(DEFAULT_TRANSITION_MS);
  const [index, setIndex] = useState(0);
  const videoRefs = useRef<Map<string | number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchHeroCarousel();
        if (cancelled) return;
        if (data.slides?.length) {
          setSlides(data.slides);
          setIndex(0);
        }
        if (data.transition_ms && data.transition_ms >= 1000) {
          setTransitionMs(data.transition_ms);
        }
      } catch {
        // Keep defaults on fetch failure.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || slides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, transitionMs);

    return () => window.clearInterval(timer);
  }, [slides.length, transitionMs]);

  useEffect(() => {
    slides.forEach((slide) => {
      const video = videoRefs.current.get(slide.id);
      if (!video) return;
      if (slides[index]?.id === slide.id) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [index, slides]);

  return (
    <section className="relative min-h-[32rem] overflow-hidden border-b border-ifma-border-light md:min-h-[40rem] lg:min-h-[44rem]">
      {slides.map((slide, slideIndex) => {
        const active = slideIndex === index;
        const commonClass = `absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ${
          active ? "opacity-100" : "opacity-0"
        }`;

        if (slide.media_type === "video") {
          return (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={slide.id}
              ref={(el) => {
                if (el) videoRefs.current.set(slide.id, el);
                else videoRefs.current.delete(slide.id);
              }}
              src={slide.file_url}
              muted
              loop
              playsInline
              className={commonClass}
              aria-hidden={!active}
            />
          );
        }

        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.id}
            src={slide.file_url}
            alt={slide.title}
            className={commonClass}
            fetchPriority={slideIndex === 0 ? "high" : "auto"}
          />
        );
      })}
      <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/55 to-caisbe-red/25" />

      <div className="relative z-10 mx-auto flex min-h-[32rem] max-w-7xl items-center px-4 py-16 md:min-h-[40rem] md:py-20 lg:min-h-[44rem]">
        <div className="w-full max-w-3xl border-l-4 border-caisbe-red pl-5 md:pl-6">
          <h1 className="text-[clamp(1.75rem,3.5vw,3.25rem)] font-semibold leading-tight text-white">
            {siteFullName}
          </h1>
          <p className="mt-6 text-[clamp(1rem,2vw,1.125rem)] leading-relaxed text-white/95">
            {heroIntro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/membership/become-a-member" variant="primary">
              Join {siteName}
            </ButtonLink>
            <ButtonLink href="/our-services" variant="secondary">
              Our Services
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
