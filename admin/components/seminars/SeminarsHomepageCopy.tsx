"use client";

import { FormEvent, useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError } from "@/lib/auth";
import type { HomeLanding, HomeLandingLocale } from "@/components/settings/LandingEditor";

type StripFields = {
  seminars_title: string;
  seminars_body_1: string;
  seminars_body_2: string;
  seminars_cta: string;
};

export default function SeminarsHomepageCopy() {
  const { notice, dialog } = useNoticeDialog();
  const [activeLang, setActiveLang] = useState<HomeLandingLocale>("en");
  const [home, setHome] = useState<HomeLanding | null>(null);
  const [strip, setStrip] = useState<StripFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<HomeLanding>(`/admin/site-pages/home?lang=${activeLang}`);
        if (!active) return;
        setHome(data);
        setStrip({
          seminars_title: data.seminars_title ?? "",
          seminars_body_1: data.seminars_body_1 ?? "",
          seminars_body_2: data.seminars_body_2 ?? "",
          seminars_cta: data.seminars_cta ?? "",
        });
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.detail : "Unable to load homepage seminar copy.");
          setHome(null);
          setStrip(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [activeLang]);

  function patchStrip(partial: Partial<StripFields>) {
    setStrip((current) => (current ? { ...current, ...partial } : current));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!home || !strip) return;
    setSaving(true);
    try {
      const saved = await apiFetch<HomeLanding>(`/admin/site-pages/home?lang=${activeLang}`, {
        method: "PUT",
        body: JSON.stringify({
          ...home,
          seminars_title: strip.seminars_title,
          seminars_body_1: strip.seminars_body_1,
          seminars_body_2: strip.seminars_body_2,
          seminars_cta: strip.seminars_cta,
        }),
      });
      setHome(saved);
      setStrip({
        seminars_title: saved.seminars_title ?? "",
        seminars_body_1: saved.seminars_body_1 ?? "",
        seminars_body_2: saved.seminars_body_2 ?? "",
        seminars_cta: saved.seminars_cta ?? "",
      });
      await notice({
        tone: "success",
        title: activeLang === "fr" ? "French strip copy saved" : "Homepage strip copy saved",
        description:
          activeLang === "fr"
            ? "The public homepage upcoming seminars strip will use this French text."
            : "The public homepage upcoming seminars strip will use this English text.",
      });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Could not save",
        description: err instanceof ApiError ? err.detail : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-4">
      {dialog}
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
              Homepage upcoming strip
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Heading, paragraphs, and link label for the homepage seminars strip. Seminar cards below are
              managed in the event list on this page.
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Homepage seminars strip language"
            className="inline-flex rounded-none border border-ifma-border bg-white p-1"
          >
            {(
              [
                { code: "en", label: "English (EN)" },
                { code: "fr", label: "Français (FR)" },
              ] as const
            ).map((option) => {
              const active = activeLang === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveLang(option.code)}
                  className={`rounded-none px-4 py-1.5 text-sm font-semibold transition ${
                    active
                      ? "bg-caisbe-red text-white shadow-sm"
                      : "text-caisbe-text hover:text-caisbe-red"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}
        {loading || !strip ? (
          <p className="text-sm text-caisbe-muted">
            Loading {activeLang === "fr" ? "French" : "English"} strip copy…
          </p>
        ) : (
          <>
            <FormField label="Heading">
              <input
                className={fieldClassName}
                value={strip.seminars_title}
                onChange={(event) => patchStrip({ seminars_title: event.target.value })}
                required
              />
            </FormField>
            <FormField label="Paragraph 1">
              <textarea
                className={textAreaClassName}
                rows={3}
                value={strip.seminars_body_1}
                onChange={(event) => patchStrip({ seminars_body_1: event.target.value })}
                required
              />
            </FormField>
            <FormField label="Paragraph 2">
              <textarea
                className={textAreaClassName}
                rows={3}
                value={strip.seminars_body_2}
                onChange={(event) => patchStrip({ seminars_body_2: event.target.value })}
                required
              />
            </FormField>
            <FormField label="Link label">
              <input
                className={fieldClassName}
                value={strip.seminars_cta}
                onChange={(event) => patchStrip({ seminars_cta: event.target.value })}
                required
              />
            </FormField>
            <div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : activeLang === "fr" ? "Save French strip" : "Save strip copy"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </form>
  );
}
