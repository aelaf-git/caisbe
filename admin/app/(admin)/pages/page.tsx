"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError } from "@/lib/auth";
import { slugify } from "@/lib/ordinalTitles";

type SectionDraft = { title: string; body: string; itemsText: string };

type SitePage = {
  id: number;
  parent_id: number | null;
  title: string;
  menu_label: string;
  slug: string;
  path: string;
  description: string;
  lead: string;
  sections: { title: string; body: string; items: string[] }[];
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  show_in_menu: boolean;
  status: "draft" | "published" | string;
};

type HomeLanding = {
  tagline: string;
  hero_intro: string;
  stats: { value: string; label: string }[];
};

const EMPTY_SECTION = (): SectionDraft => ({ title: "", body: "", itemsText: "" });

function blankPage(): {
  title: string;
  menu_label: string;
  slug: string;
  parent_id: number | null;
  description: string;
  lead: string;
  sections: SectionDraft[];
  cta_label: string;
  cta_href: string;
  sort_order: number;
  show_in_menu: boolean;
  status: "draft" | "published";
} {
  return {
    title: "",
    menu_label: "",
    slug: "",
    parent_id: null,
    description: "",
    lead: "",
    sections: [EMPTY_SECTION()],
    cta_label: "",
    cta_href: "",
    sort_order: 0,
    show_in_menu: true,
    status: "draft",
  };
}

function descendantIds(pages: SitePage[], pageId: number): Set<number> {
  const found = new Set<number>();
  const pending = [pageId];
  while (pending.length) {
    const current = pending.pop() as number;
    for (const page of pages) {
      if (page.parent_id === current && !found.has(page.id)) {
        found.add(page.id);
        pending.push(page.id);
      }
    }
  }
  return found;
}

export default function PagesAdminPage() {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { notice, dialog: noticeDialog } = useNoticeDialog();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [home, setHome] = useState<HomeLanding | null>(null);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState(blankPage());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [pageData, homeData] = await Promise.all([
        apiFetch<SitePage[]>("/admin/site-pages"),
        apiFetch<HomeLanding>("/admin/site-pages/home"),
      ]);
      setPages(pageData);
      setHome({
        tagline: homeData.tagline || "",
        hero_intro: homeData.hero_intro || "",
        stats: homeData.stats?.length
          ? homeData.stats
          : [
              { value: "", label: "" },
              { value: "", label: "" },
              { value: "", label: "" },
              { value: "", label: "" },
            ],
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load pages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openPage(page: SitePage) {
    setSelectedId(page.id);
    setDraft({
      title: page.title,
      menu_label: page.menu_label,
      slug: page.slug,
      parent_id: page.parent_id,
      description: page.description,
      lead: page.lead,
      sections: page.sections.length
        ? page.sections.map((section) => ({
            title: section.title,
            body: section.body,
            itemsText: section.items.join("\n"),
          }))
        : [EMPTY_SECTION()],
      cta_label: page.cta_label || "",
      cta_href: page.cta_href || "",
      sort_order: page.sort_order,
      show_in_menu: page.show_in_menu,
      status: page.status === "published" ? "published" : "draft",
    });
  }

  const parentOptions = useMemo(() => {
    const blocked = selectedId && selectedId !== "new" ? descendantIds(pages, selectedId) : new Set<number>();
    if (typeof selectedId === "number") blocked.add(selectedId);
    return pages.filter((page) => !blocked.has(page.id));
  }, [pages, selectedId]);

  async function saveHome(event: FormEvent) {
    event.preventDefault();
    if (!home) return;
    setSaving(true);
    try {
      const saved = await apiFetch<HomeLanding>("/admin/site-pages/home", {
        method: "PUT",
        body: JSON.stringify(home),
      });
      setHome(saved);
      void notice({ tone: "success", title: "Home text saved", description: "The public homepage will use this text." });
    } catch (err) {
      void notice({
        tone: "error",
        title: "Could not save home text",
        description: err instanceof ApiError ? err.detail : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function savePage(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: draft.title,
        menu_label: draft.menu_label,
        slug: draft.slug,
        parent_id: draft.parent_id,
        description: draft.description,
        lead: draft.lead,
        sections: draft.sections
          .filter((section) => section.title.trim())
          .map((section) => ({
            title: section.title,
            body: section.body,
            items: section.itemsText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          })),
        cta_label: draft.cta_label || null,
        cta_href: draft.cta_href || null,
        sort_order: Number(draft.sort_order) || 0,
        show_in_menu: draft.show_in_menu,
        status: draft.status,
      };
      const saved =
        selectedId && selectedId !== "new"
          ? await apiFetch<SitePage>(`/admin/site-pages/${selectedId}`, {
              method: "PUT",
              body: JSON.stringify(payload),
            })
          : await apiFetch<SitePage>("/admin/site-pages", {
              method: "POST",
              body: JSON.stringify(payload),
            });
      await load(true);
      openPage(saved);
      void notice({ tone: "success", title: "Page saved", description: saved.path });
    } catch (err) {
      void notice({
        tone: "error",
        title: "Could not save page",
        description: err instanceof ApiError ? err.detail : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function removePage() {
    if (typeof selectedId !== "number") return;
    const page = pages.find((item) => item.id === selectedId);
    const ok = await confirm({
      title: "Delete this page?",
      description: page ? `${page.title} (${page.path}) will be removed.` : "This page will be removed.",
      confirmLabel: "Delete page",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/site-pages/${selectedId}`, { method: "DELETE" });
      setSelectedId(null);
      await load(true);
    } catch (err) {
      void notice({
        tone: "error",
        title: "Could not delete page",
        description: err instanceof ApiError ? err.detail : "Try again.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publishing"
        title="Pages"
        description="Edit the homepage text, the current landing pages, and add new pages or subpages to the public menu."
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading || !home ? (
        <p className="text-sm text-caisbe-muted">Loading pages…</p>
      ) : (
        <>
          <Card className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Home</h2>
            <p className="text-sm text-caisbe-muted">
              The landing sentence, tagline, and statistics. Homepage photos stay in Media.
            </p>
            <form onSubmit={(event) => void saveHome(event)} className="space-y-4">
              <FormField label="Tagline">
                <input
                  className={fieldClassName}
                  value={home.tagline}
                  onChange={(event) => setHome({ ...home, tagline: event.target.value })}
                  required
                />
              </FormField>
              <FormField label="Landing sentence">
                <textarea
                  className={textAreaClassName}
                  rows={4}
                  value={home.hero_intro}
                  onChange={(event) => setHome({ ...home, hero_intro: event.target.value })}
                  required
                />
              </FormField>
              <div className="grid gap-3 md:grid-cols-2">
                {home.stats.map((stat, index) => (
                  <div key={index} className="grid grid-cols-[7rem_1fr] gap-2">
                    <input
                      className={fieldClassName}
                      value={stat.value}
                      aria-label={`Statistic ${index + 1} value`}
                      onChange={(event) =>
                        setHome({
                          ...home,
                          stats: home.stats.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, value: event.target.value } : item,
                          ),
                        })
                      }
                      required
                    />
                    <input
                      className={fieldClassName}
                      value={stat.label}
                      aria-label={`Statistic ${index + 1} label`}
                      onChange={(event) =>
                        setHome({
                          ...home,
                          stats: home.stats.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value } : item,
                          ),
                        })
                      }
                      required
                    />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save home text"}
              </Button>
            </form>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">All pages</h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedId("new");
                    setDraft(blankPage());
                  }}
                >
                  New page
                </Button>
              </div>
              <ul className="max-h-[32rem] space-y-1 overflow-y-auto text-sm">
                {pages.map((page) => (
                  <li key={page.id}>
                    <button
                      type="button"
                      onClick={() => openPage(page)}
                      className={`w-full rounded-md px-2 py-1.5 text-left hover:bg-admin-surface-muted ${
                        selectedId === page.id ? "bg-caisbe-red/10 text-caisbe-red" : "text-caisbe-text"
                      }`}
                    >
                      <span className="block font-medium">{page.menu_label}</span>
                      <span className="block text-xs text-caisbe-muted">
                        {page.path} · {page.status === "published" ? "Published" : "Draft"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {selectedId ? (
              <Card>
                <form onSubmit={(event) => void savePage(event)} className="space-y-4">
                  <h2 className="font-display text-lg font-semibold">
                    {selectedId === "new" ? "New page" : "Edit page"}
                  </h2>
                  <FormField label="Title">
                    <input
                      className={fieldClassName}
                      value={draft.title}
                      required
                      onChange={(event) => {
                        const title = event.target.value;
                        setDraft((current) => ({
                          ...current,
                          title,
                          slug: current.slug || slugify(title),
                          menu_label: current.menu_label || title,
                        }));
                      }}
                    />
                  </FormField>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Menu label" hint="The words shown in the public menu.">
                      <input
                        className={fieldClassName}
                        value={draft.menu_label}
                        onChange={(event) => setDraft({ ...draft, menu_label: event.target.value })}
                      />
                    </FormField>
                    <FormField label="Slug" hint="Lowercase words separated by hyphens.">
                      <input
                        className={fieldClassName}
                        value={draft.slug}
                        required
                        onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })}
                      />
                    </FormField>
                  </div>
                  <FormField label="Parent page" hint="Leave empty for a top-level menu item. A parent makes this a subpage.">
                    <select
                      className={fieldClassName}
                      value={draft.parent_id ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          parent_id: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    >
                      <option value="">No parent — top-level page</option>
                      {parentOptions.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.path} — {page.title}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Short description">
                    <textarea
                      className={textAreaClassName}
                      rows={2}
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    />
                  </FormField>
                  <FormField label="Lead paragraph">
                    <textarea
                      className={textAreaClassName}
                      rows={3}
                      value={draft.lead}
                      onChange={(event) => setDraft({ ...draft, lead: event.target.value })}
                    />
                  </FormField>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Sections</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setDraft({ ...draft, sections: [...draft.sections, EMPTY_SECTION()] })}
                      >
                        Add section
                      </Button>
                    </div>
                    {draft.sections.map((section, index) => (
                      <div key={index} className="space-y-2 rounded-xl border border-ifma-border p-3">
                        <input
                          className={fieldClassName}
                          placeholder="Section heading"
                          value={section.title}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, title: event.target.value } : item,
                              ),
                            })
                          }
                        />
                        <textarea
                          className={textAreaClassName}
                          rows={2}
                          placeholder="Paragraph"
                          value={section.body}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, body: event.target.value } : item,
                              ),
                            })
                          }
                        />
                        <textarea
                          className={textAreaClassName}
                          rows={3}
                          placeholder="Bullet lines, one per line"
                          value={section.itemsText}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, itemsText: event.target.value } : item,
                              ),
                            })
                          }
                        />
                        {draft.sections.length > 1 ? (
                          <button
                            type="button"
                            className="text-sm font-semibold text-caisbe-red"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                sections: draft.sections.filter((_, itemIndex) => itemIndex !== index),
                              })
                            }
                          >
                            Remove section
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Button label">
                      <input
                        className={fieldClassName}
                        value={draft.cta_label}
                        onChange={(event) => setDraft({ ...draft, cta_label: event.target.value })}
                      />
                    </FormField>
                    <FormField label="Button link">
                      <input
                        className={fieldClassName}
                        value={draft.cta_href}
                        placeholder="/contact"
                        onChange={(event) => setDraft({ ...draft, cta_href: event.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Sort order">
                      <input
                        type="number"
                        className={fieldClassName}
                        value={draft.sort_order}
                        onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })}
                      />
                    </FormField>
                    <FormField label="Status">
                      <select
                        className={fieldClassName}
                        value={draft.status}
                        onChange={(event) =>
                          setDraft({ ...draft, status: event.target.value === "published" ? "published" : "draft" })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </FormField>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-caisbe-text">
                    <input
                      type="checkbox"
                      checked={draft.show_in_menu}
                      onChange={(event) => setDraft({ ...draft, show_in_menu: event.target.checked })}
                    />
                    Show in the public menu
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save page"}
                    </Button>
                    {typeof selectedId === "number" ? (
                      <Button type="button" variant="secondary" onClick={() => void removePage()}>
                        Delete page
                      </Button>
                    ) : null}
                  </div>
                </form>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-caisbe-muted">Choose a page or create a new one.</p>
              </Card>
            )}
          </div>
        </>
      )}
      {confirmDialog}
      {noticeDialog}
    </div>
  );
}
