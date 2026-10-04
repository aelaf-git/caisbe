"use client";

import { useEffect, useRef, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { fetchHeroCarousel, portalMembershipRegisterUrl, type HeroSlide } from "@/lib/api";
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
        // Keep the default slides on fetch failure.
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
    <section className="relative overflow-hidden bg-[#f8fafc]">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:gap-10 sm:py-16 md:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="min-w-0">
          <h1 className="font-hopewell-display text-3xl font-extrabold leading-[1.08] tracking-tight text-caisbe-text-dark sm:text-4xl md:text-5xl">
            {siteFullName}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-caisbe-muted sm:mt-5 sm:text-xl sm:leading-8">
            {heroIntro}
          </p>
          <div className="mt-6 sm:mt-8 sm:inline-flex">
            <ButtonLink href={portalMembershipRegisterUrl()} variant="pill">
              Join {siteName}
            </ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-[0_20px_45px_-12px_rgba(196,32,50,0.28)] sm:aspect-[5/4] lg:aspect-[4/5]">
            {slides.map((slide, slideIndex) => {
              const active = slideIndex === index;
              const commonClass = `absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out ${
                active ? "opacity-100" : "opacity-0"
              }`;

              if (slide.media_type === "video") {
                return (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    key={slide.id}
                    ref={(element) => {
                      if (element) videoRefs.current.set(slide.id, element);
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
          </div>
        </div>
      </div>
    </section>
  );
}
