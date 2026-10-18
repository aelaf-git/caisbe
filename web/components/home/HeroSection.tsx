"use client";

import { useEffect, useRef, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { fetchHeroCarousel, portalMembershipRegisterUrl, type HeroSlide } from "@/lib/api";
import { heroIntro, siteFullName, siteName } from "@/lib/data/home";
import { useT } from "@/lib/i18n/LocaleProvider";

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "default-1",
    title: "CAISBE campus and learning community",
    file_url: "/images/hero_1.jpeg",
    media_type: "image",
    show_text_panel: true,
    eyebrow: "Membership",
    headline: "CAISBE",
    description: null,
    cta_label: null,
    cta_url: null,
  },
  {
    id: "default-2",
    title: "CAISBE students and professionals",
    file_url: "/images/hero_2.jpeg",
    media_type: "image",
    show_text_panel: true,
    eyebrow: "Professional development",
    headline: "Build your FM career",
    description: null,
    cta_label: null,
    cta_url: "/professional-development",
  },
  {
    id: "default-3",
    title: "CAISBE built environment education",
    file_url: "/images/hero_3.jpeg",
    media_type: "image",
    show_text_panel: false,
  },
];

const DEFAULT_TRANSITION_MS = 3000;

function resolveCtaHref(raw: string | null | undefined, fallback: string): string {
  const value = (raw || "").trim();
  if (!value) return fallback;
  return value;
}

export default function HeroSection({
  heading,
  intro,
  buttonLabel,
}: {
  heading?: string | null;
  intro?: string | null;
  buttonLabel?: string | null;
}) {
  const t = useT();
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

  const active = slides[index] ?? slides[0];
  const showPanel = active?.show_text_panel !== false;
  const showControls = slides.length > 1;
  const membershipHref = portalMembershipRegisterUrl();

  const panelEyebrow =
    active?.eyebrow?.trim() || t("Membership", "Adhésion");
  const panelHeadline = active?.headline?.trim() || siteName;
  const panelSubhead = heading || siteFullName;
  const panelBody = active?.description?.trim() || intro || heroIntro;
  const panelCtaLabel =
    active?.cta_label?.trim() ||
    (buttonLabel === "" ? "" : buttonLabel || `Join ${siteName}`);
  const panelCtaHref = resolveCtaHref(active?.cta_url, membershipHref);

  function go(delta: -1 | 1) {
    setIndex((current) => (current + delta + slides.length) % slides.length);
  }

  return (
    <section className="relative isolate min-h-[min(36rem,calc(100svh-6.5rem))] overflow-hidden bg-caisbe-text-dark sm:min-h-[min(42rem,calc(100svh-7rem))] lg:min-h-[min(46rem,calc(100svh-7rem))]">
      <div className="absolute inset-0" aria-hidden={!showPanel}>
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          const commonClass = `absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out ${
            isActive ? "opacity-100" : "opacity-0"
          }`;

          if (slide.media_type === "video") {
            return (
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
                aria-hidden={!isActive}
              />
            );
          }

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={slide.id}
              src={slide.file_url}
              alt={isActive ? slide.title || "" : ""}
              className={commonClass}
              fetchPriority={slideIndex === 0 ? "high" : "auto"}
            />
          );
        })}
      </div>

      {showPanel ? (
        <div className="relative mx-auto flex min-h-[inherit] max-w-[90rem] items-center px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
          <div className="w-full max-w-xl bg-[#1a2332]/92 p-7 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] backdrop-blur-[2px] sm:p-9 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
              {panelEyebrow}
            </p>
            <p className="mt-4 font-hopewell-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {panelHeadline}
            </p>
            {panelSubhead && panelSubhead !== panelHeadline ? (
              <h1 className="mt-3 font-hopewell-display text-lg font-bold leading-snug tracking-tight text-white/95 sm:text-xl md:text-2xl">
                {panelSubhead}
              </h1>
            ) : (
              <h1 className="sr-only">{panelHeadline}</h1>
            )}
            <p className="mt-4 text-sm leading-7 text-white/85 sm:text-base sm:leading-7">
              {panelBody}
            </p>
            {panelCtaLabel ? (
              <div className="mt-7">
                <ButtonLink href={panelCtaHref} variant="pill">
                  {panelCtaLabel}
                </ButtonLink>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <h1 className="sr-only">{active?.headline || active?.title || siteName}</h1>
      )}

      {showControls ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("Previous slide", "Diapositive précédente")}
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-caisbe-red text-white shadow-md transition hover:bg-caisbe-red-dark sm:left-5 sm:h-12 sm:w-12"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("Next slide", "Diapositive suivante")}
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-caisbe-red text-white shadow-md transition hover:bg-caisbe-red-dark sm:right-5 sm:h-12 sm:w-12"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-8">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                aria-label={t(`Show slide ${slideIndex + 1}`, `Afficher la diapositive ${slideIndex + 1}`)}
                aria-current={slideIndex === index ? "true" : undefined}
                onClick={() => setIndex(slideIndex)}
                className={`h-2.5 rounded-full transition-all ${
                  slideIndex === index
                    ? "w-8 bg-caisbe-red"
                    : "w-2.5 bg-white/80 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
