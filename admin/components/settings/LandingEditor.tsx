"use client";

import { FormEvent, useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError } from "@/lib/auth";

type CardItem = { title: string; description: string };
type OfficeItem = { region: string; address: string; map_query: string };
type StatItem = { value: string; label: string };

export type HomeLanding = {
  tagline: string;
  hero_intro: string;
  hero_button: string;
  stats: StatItem[];
  about_eyebrow: string;
  about_body: string;
  about_cta: string;
  about_highlights: CardItem[];
  certificates_title: string;
  certificates_subtitle: string;
  certificates_cta: string;
  magazine_title: string;
  magazine_subtitle: string;
  magazine_cta: string;
  practice_eyebrow: string;
  practice_title: string;
  practice_body: string;
  practice_items: CardItem[];
  offices_title: string;
  offices: OfficeItem[];
  testimonials_eyebrow: string;
  testimonials_title: string;
  contact_eyebrow: string;
  contact_title: string;
  contact_lead: string;
  contact_address: string;
  contact_phone: string;
  contact_email: string;
  contact_hours: string;
  contact_form_heading: string;
  contact_cta: string;
};

function TextInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <FormField label={label} hint={hint}>
      <input className={fieldClassName} value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <FormField label={label}>
      <textarea className={textAreaClassName} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

export type HomeLandingLocale = "en" | "fr";

export default function LandingEditor() {
  const { notice, dialog } = useNoticeDialog();
  const [activeLang, setActiveLang] = useState<HomeLandingLocale>("en");
  const [home, setHome] = useState<HomeLanding | null>(null);
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
        if (active) setHome(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load the landing page.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [activeLang]);

  function patch(partial: Partial<HomeLanding>) {
    setHome((current) => (current ? { ...current, ...partial } : current));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!home) return;
    setSaving(true);
    try {
      const saved = await apiFetch<HomeLanding>(`/admin/site-pages/home?lang=${activeLang}`, {
        method: "PUT",
        body: JSON.stringify(home),
      });
      setHome(saved);
      await notice({
        tone: "success",
        title: activeLang === "fr" ? "French landing page saved" : "Landing page saved",
        description:
          activeLang === "fr"
            ? "The public homepage will use this French text when visitors select FR."
            : "The public homepage will use this English text.",
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
    <form onSubmit={(event) => void save(event)} className="space-y-6">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-caisbe-muted">
          Edit the words on the public homepage, including the statistics strip under the hero. Course cards, magazine
          issues, hero photos, and testimonial quotes stay in Courses, Media, and Testimonials.
        </p>
        <div
          role="tablist"
          aria-label="Landing page language"
          className="inline-flex rounded-full border border-ifma-border bg-white p-1"
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
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
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
      {loading || !home ? (
        <p className="text-sm text-caisbe-muted">
          Loading {activeLang === "fr" ? "French" : "English"} landing page…
        </p>
      ) : (
        <>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Hero</h2>
        <TextArea label="Landing sentence" value={home.hero_intro} onChange={(hero_intro) => patch({ hero_intro })} rows={4} />
        <TextInput label="Join button" value={home.hero_button} onChange={(hero_button) => patch({ hero_button })} />
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Statistics</h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Numbers shown under the hero, such as chapter counts and association totals.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => patch({ stats: [...home.stats, { value: "", label: "" }] })}
          >
            Add statistic
          </Button>
        </div>
        {home.stats.map((stat, index) => (
          <div
            key={index}
            className="grid gap-3 border-t border-ifma-border pt-4 sm:grid-cols-[7rem_1fr_auto] sm:items-end"
          >
            <FormField label="Value">
              <input
                className={fieldClassName}
                value={stat.value}
                placeholder="12+"
                aria-label={`Statistic ${index + 1} value`}
                onChange={(event) =>
                  patch({
                    stats: home.stats.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, value: event.target.value } : item,
                    ),
                  })
                }
                required
              />
            </FormField>
            <FormField label="Label">
              <input
                className={fieldClassName}
                value={stat.label}
                placeholder="African based trade and professionals associations"
                aria-label={`Statistic ${index + 1} label`}
                onChange={(event) =>
                  patch({
                    stats: home.stats.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item,
                    ),
                  })
                }
                required
              />
            </FormField>
            {home.stats.length > 1 ? (
              <button
                type="button"
                className="pb-2 text-left text-sm font-semibold text-caisbe-red sm:text-center"
                onClick={() => patch({ stats: home.stats.filter((_, itemIndex) => itemIndex !== index) })}
              >
                Remove
              </button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}
          </div>
        ))}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">About</h2>
        <TextInput label="Eyebrow" value={home.about_eyebrow} onChange={(about_eyebrow) => patch({ about_eyebrow })} />
        <TextInput label="Tagline" value={home.tagline} onChange={(tagline) => patch({ tagline })} />
        <TextArea label="Paragraph" value={home.about_body} onChange={(about_body) => patch({ about_body })} rows={5} />
        <TextInput label="Button" value={home.about_cta} onChange={(about_cta) => patch({ about_cta })} />
        <CardList
          label="Highlights"
          items={home.about_highlights}
          onChange={(about_highlights) => patch({ about_highlights })}
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Certificate programs</h2>
        <TextInput label="Heading" value={home.certificates_title} onChange={(certificates_title) => patch({ certificates_title })} />
        <TextInput
          label="Subtitle"
          value={home.certificates_subtitle}
          onChange={(certificates_subtitle) => patch({ certificates_subtitle })}
        />
        <TextInput label="Link label" value={home.certificates_cta} onChange={(certificates_cta) => patch({ certificates_cta })} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Magazine</h2>
        <TextInput label="Heading" value={home.magazine_title} onChange={(magazine_title) => patch({ magazine_title })} />
        <TextInput label="Subtitle" value={home.magazine_subtitle} onChange={(magazine_subtitle) => patch({ magazine_subtitle })} />
        <TextInput label="Link label" value={home.magazine_cta} onChange={(magazine_cta) => patch({ magazine_cta })} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Practice</h2>
        <TextInput label="Eyebrow" value={home.practice_eyebrow} onChange={(practice_eyebrow) => patch({ practice_eyebrow })} />
        <TextInput label="Heading" value={home.practice_title} onChange={(practice_title) => patch({ practice_title })} />
        <TextArea label="Intro" value={home.practice_body} onChange={(practice_body) => patch({ practice_body })} />
        <CardList label="Cards" items={home.practice_items} onChange={(practice_items) => patch({ practice_items })} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Offices</h2>
        <TextInput label="Heading" value={home.offices_title} onChange={(offices_title) => patch({ offices_title })} />
        {home.offices.map((office, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-ifma-border p-3">
            <input
              className={fieldClassName}
              placeholder="Region"
              value={office.region}
              onChange={(event) =>
                patch({
                  offices: home.offices.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, region: event.target.value } : item,
                  ),
                })
              }
            />
            <textarea
              className={textAreaClassName}
              rows={2}
              placeholder="Address"
              value={office.address}
              onChange={(event) =>
                patch({
                  offices: home.offices.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, address: event.target.value } : item,
                  ),
                })
              }
            />
            <input
              className={fieldClassName}
              placeholder="Map search, for example 815 4 Ave SW, Calgary"
              value={office.map_query}
              onChange={(event) =>
                patch({
                  offices: home.offices.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, map_query: event.target.value } : item,
                  ),
                })
              }
            />
            <button
              type="button"
              className="text-sm font-semibold text-caisbe-red"
              onClick={() => patch({ offices: home.offices.filter((_, itemIndex) => itemIndex !== index) })}
            >
              Remove office
            </button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => patch({ offices: [...home.offices, { region: "", address: "", map_query: "" }] })}
        >
          Add office
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Testimonials heading</h2>
        <TextInput
          label="Eyebrow"
          value={home.testimonials_eyebrow}
          onChange={(testimonials_eyebrow) => patch({ testimonials_eyebrow })}
        />
        <TextInput
          label="Heading"
          value={home.testimonials_title}
          onChange={(testimonials_title) => patch({ testimonials_title })}
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Contact block</h2>
        <TextInput label="Eyebrow" value={home.contact_eyebrow} onChange={(contact_eyebrow) => patch({ contact_eyebrow })} />
        <TextInput label="Heading" value={home.contact_title} onChange={(contact_title) => patch({ contact_title })} />
        <TextArea label="Intro" value={home.contact_lead} onChange={(contact_lead) => patch({ contact_lead })} />
        <TextArea label="Address" value={home.contact_address} onChange={(contact_address) => patch({ contact_address })} />
        <TextInput label="Phone" value={home.contact_phone} onChange={(contact_phone) => patch({ contact_phone })} />
        <TextInput label="Email" value={home.contact_email} onChange={(contact_email) => patch({ contact_email })} />
        <TextInput label="Hours" value={home.contact_hours} onChange={(contact_hours) => patch({ contact_hours })} />
        <TextInput
          label="Form heading"
          value={home.contact_form_heading}
          onChange={(contact_form_heading) => patch({ contact_form_heading })}
        />
        <TextInput label="Send button" value={home.contact_cta} onChange={(contact_cta) => patch({ contact_cta })} />
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : activeLang === "fr" ? "Save French landing page" : "Save English landing page"}
      </Button>
        </>
      )}
    </form>
  );
}

function CardList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: CardItem[];
  onChange: (items: CardItem[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, { title: "", description: "" }])}>
          Add
        </Button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-xl border border-ifma-border p-3">
          <input
            className={fieldClassName}
            placeholder="Title"
            value={item.title}
            onChange={(event) =>
              onChange(items.map((row, rowIndex) => (rowIndex === index ? { ...row, title: event.target.value } : row)))
            }
          />
          <textarea
            className={textAreaClassName}
            rows={3}
            placeholder="Description"
            value={item.description}
            onChange={(event) =>
              onChange(
                items.map((row, rowIndex) => (rowIndex === index ? { ...row, description: event.target.value } : row)),
              )
            }
          />
          <button
            type="button"
            className="text-sm font-semibold text-caisbe-red"
            onClick={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
