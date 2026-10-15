"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import SaveButton from "@/components/ui/SaveButton";
import { apiFetch, ApiError } from "@/lib/auth";

export type TranslationEntityType =
  | "site_page"
  | "news"
  | "event"
  | "job"
  | "seminar"
  | "testimonial"
  | "media"
  | "course";

export type TranslationField = {
  name: string;
  label: string;
  /** "text" = single line, "textarea" = multi-line (HTML allowed for rich fields), "sections" = page sections. */
  kind?: "text" | "textarea" | "sections";
  rows?: number;
};

export type TranslationSection = { title: string; body?: string; items?: string[] };

type TranslationResponse = {
  entity_type: string;
  entity_id: number;
  lang: string;
  allowed_fields: string[];
  fields: Record<string, unknown>;
};

type Values = Record<string, unknown>;

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asSections(value: unknown): TranslationSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      title: asText(item.title),
      body: asText(item.body),
      items: Array.isArray(item.items) ? item.items.map((entry) => String(entry)) : [],
    }));
}

function itemsToText(items: string[] | undefined): string {
  return (items ?? []).join("\n");
}

function textToItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * French editing for one record. The English original is shown read-only beside each French input.
 * Empty French fields fall back to English on the public site.
 */
export default function FrenchTranslationPanel({
  entityType,
  entityId,
  fields,
  english,
  title = "French (FR)",
}: {
  entityType: TranslationEntityType;
  /** `null` while the record has not been saved yet. */
  entityId: number | null;
  fields: TranslationField[];
  /** Current English values by field name (strings or section arrays). */
  english: Record<string, unknown>;
  title?: string;
}) {
  const [values, setValues] = useState<Values>({});
  const [saved, setSaved] = useState<string>("{}");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (entityId === null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TranslationResponse>(`/admin/translations/${entityType}/${entityId}?lang=fr`);
      setValues(data.fields ?? {});
      setSaved(JSON.stringify(data.fields ?? {}));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the French translation.");
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    setValues({});
    setSaved("{}");
    setMessage(null);
    void load();
  }, [load]);

  const dirty = useMemo(() => JSON.stringify(values) !== saved, [values, saved]);

  function setField(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
    setMessage(null);
  }

  function copyEnglish() {
    const next: Values = {};
    for (const field of fields) {
      const source = english[field.name];
      if (field.kind === "sections") {
        next[field.name] = asSections(source);
      } else {
        next[field.name] = asText(source);
      }
    }
    setValues(next);
    setMessage(null);
  }

  async function save() {
    if (entityId === null) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<TranslationResponse>(`/admin/translations/${entityType}/${entityId}?lang=fr`, {
        method: "PUT",
        body: JSON.stringify({ fields: values }),
      });
      setValues(data.fields ?? {});
      setSaved(JSON.stringify(data.fields ?? {}));
      setMessage("French saved. Empty fields fall back to English.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the French translation.");
    } finally {
      setSaving(false);
    }
  }

  if (entityId === null) {
    return (
      <div className="rounded-[20px] border border-dashed border-ifma-border bg-admin-surface-muted p-4 text-sm text-caisbe-muted">
        <p className="font-semibold text-caisbe-text">{title}</p>
        <p className="mt-1">Save the English version first, then reopen it to add the French text.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-[20px] border border-ifma-border bg-admin-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-caisbe-text">{title}</h3>
          <p className="text-xs leading-5 text-caisbe-muted">
            Written by hand. Leave a field empty to show the English text on the French site.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={copyEnglish} disabled={loading}>
            Copy English
          </Button>
          <SaveButton
            dirty={dirty}
            saving={saving}
            idleLabel="Save French"
            size="sm"
            onClick={() => void save()}
          />
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {loading ? <p className="text-sm text-caisbe-muted">Loading…</p> : null}

      {fields.map((field) => {
        if (field.kind === "sections") {
          const englishSections = asSections(english[field.name]);
          const frenchSections = asSections(values[field.name]);
          return (
            <div key={field.name} className="space-y-3">
              <p className="text-sm font-semibold text-caisbe-text">{field.label}</p>
              {englishSections.length === 0 ? (
                <p className="text-xs text-caisbe-muted">This page has no sections in English.</p>
              ) : (
                englishSections.map((section, index) => {
                  const fr = frenchSections[index] ?? { title: "", body: "", items: [] };
                  function update(patch: Partial<TranslationSection>) {
                    const next = englishSections.map((_, i) => frenchSections[i] ?? { title: "", body: "", items: [] });
                    next[index] = { ...fr, ...patch };
                    setField(field.name, next);
                  }
                  return (
                    <div key={index} className="grid gap-3 rounded-[16px] bg-admin-surface p-3 md:grid-cols-2">
                      <div className="space-y-1 text-sm text-caisbe-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide">English</p>
                        <p className="font-semibold text-caisbe-text">{section.title}</p>
                        {section.body ? <p className="whitespace-pre-wrap">{section.body}</p> : null}
                        {section.items && section.items.length > 0 ? (
                          <ul className="list-disc pl-5">
                            {section.items.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Français</p>
                        <input
                          className={fieldClassName}
                          placeholder="Titre de la section"
                          value={fr.title}
                          onChange={(event) => update({ title: event.target.value })}
                        />
                        {section.body ? (
                          <textarea
                            className={textAreaClassName}
                            rows={4}
                            placeholder="Texte"
                            value={fr.body ?? ""}
                            onChange={(event) => update({ body: event.target.value })}
                          />
                        ) : null}
                        {section.items && section.items.length > 0 ? (
                          <textarea
                            className={textAreaClassName}
                            rows={Math.max(3, section.items.length)}
                            placeholder="Un élément par ligne"
                            value={itemsToText(fr.items)}
                            onChange={(event) => update({ items: textToItems(event.target.value) })}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        }

        const englishValue = asText(english[field.name]);
        const frenchValue = asText(values[field.name]);
        return (
          <div key={field.name} className="grid gap-3 md:grid-cols-2">
            <div className="text-sm">
              <p className="mb-1.5 font-semibold text-caisbe-text">{field.label} (English)</p>
              <p className="whitespace-pre-wrap rounded-[16px] bg-admin-surface px-4 py-3 text-caisbe-muted">
                {englishValue || "—"}
              </p>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold text-caisbe-text">{field.label} (Français)</span>
              {field.kind === "textarea" ? (
                <textarea
                  className={textAreaClassName}
                  rows={field.rows ?? 4}
                  value={frenchValue}
                  onChange={(event) => setField(field.name, event.target.value)}
                />
              ) : (
                <input
                  className={fieldClassName}
                  value={frenchValue}
                  onChange={(event) => setField(field.name, event.target.value)}
                />
              )}
            </label>
          </div>
        );
      })}
    </section>
  );
}
