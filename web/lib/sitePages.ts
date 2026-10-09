import type { NavSectionData } from "@/components/layout/nav-types";
import { apiFetch } from "@/lib/api";
import type { TopicPage } from "@/lib/data/site-pages";

export type SiteNavItem = {
  menu_label: string;
  path: string;
  parent_path: string | null;
  sort_order: number;
};

type SitePageApi = {
  slug: string;
  title: string;
  description: string;
  lead: string;
  sections: { title: string; body: string; items: string[] }[];
  cta_label: string | null;
  cta_href: string | null;
};

export type HomeLanding = {
  tagline: string | null;
  hero_intro: string | null;
  stats: { value: string; label: string }[];
};

const EMPTY_HOME: HomeLanding = { tagline: null, hero_intro: null, stats: [] };

function toTopicPage(page: SitePageApi): TopicPage {
  return {
    slug: page.slug,
    title: page.title,
    description: page.description,
    lead: page.lead,
    sections: page.sections.map((section) => ({
      title: section.title,
      body: section.body,
      items: section.items,
    })),
    ctaLabel: page.cta_label || undefined,
    ctaHref: page.cta_href || undefined,
  };
}

export async function fetchPublishedSitePage(path: string): Promise<TopicPage | null> {
  try {
    const page = await apiFetch<SitePageApi>(
      `/site-pages/by-path?path=${encodeURIComponent(path)}`,
    );
    return toTopicPage(page);
  } catch {
    return null;
  }
}

export async function fetchSiteNav(): Promise<SiteNavItem[]> {
  try {
    const data = await apiFetch<{ items: SiteNavItem[] }>("/site-pages/nav");
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function fetchHomeLanding(): Promise<HomeLanding> {
  try {
    const data = await apiFetch<HomeLanding>("/site-pages/home");
    return {
      tagline: data.tagline || null,
      hero_intro: data.hero_intro || null,
      stats: data.stats ?? [],
    };
  } catch {
    return EMPTY_HOME;
  }
}

export function topicChrome(path: string) {
  if (path.startsWith("/about/") || path === "/about") {
    return { eyebrow: "About CAISBE", indexHref: "/about", indexLabel: "About Overview" };
  }
  if (path.startsWith("/resources/") || path === "/resources") {
    return { eyebrow: "Resources", indexHref: "/resources", indexLabel: "All Resources" };
  }
  if (path.startsWith("/membership/") || path === "/membership") {
    return { eyebrow: "Membership", indexHref: "/membership", indexLabel: "Membership Overview" };
  }
  if (path.startsWith("/events/") || path === "/events") {
    return { eyebrow: "Events", indexHref: "/events", indexLabel: "Events Overview" };
  }
  if (path.startsWith("/network/") || path === "/network") {
    return { eyebrow: "Network", indexHref: "/network", indexLabel: "Network Overview" };
  }
  if (path.startsWith("/professional-development/") || path === "/professional-development") {
    return {
      eyebrow: "Professional Development",
      indexHref: "/professional-development",
      indexLabel: "Programs Overview",
    };
  }
  if (path === "/partners") {
    return { eyebrow: "Partnerships", indexHref: "/", indexLabel: "Home" };
  }
  if (path === "/careers" || path.startsWith("/careers/")) {
    return { eyebrow: "Resources", indexHref: "/resources", indexLabel: "All Resources" };
  }
  if (path === "/projects") {
    return { eyebrow: "Programs", indexHref: "/", indexLabel: "Home" };
  }
  if (path === "/store") {
    return { eyebrow: "Store", indexHref: "/", indexLabel: "Home" };
  }
  if (path === "/privacy-policy") {
    return { eyebrow: "Legal", indexHref: "/", indexLabel: "Home" };
  }
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 1) {
    return {
      eyebrow: "CAISBE",
      indexHref: `/${parts.slice(0, -1).join("/")}`,
      indexLabel: "Overview",
    };
  }
  return { eyebrow: "CAISBE", indexHref: "/", indexLabel: "Home" };
}

function knownHrefs(sections: NavSectionData[]) {
  const known = new Set<string>();
  for (const section of sections) {
    known.add(section.href);
    for (const group of section.groups) {
      known.add(group.href);
      for (const link of group.links) known.add(link.href);
    }
  }
  return known;
}

export function mergeSiteNav(sections: NavSectionData[], items: SiteNavItem[]): NavSectionData[] {
  const next = sections.map((section) => ({
    ...section,
    groups: section.groups.map((group) => ({
      ...group,
      links: group.links.map((link) => ({ ...link })),
    })),
  }));
  const known = knownHrefs(next);
  const sorted = [...items].sort(
    (a, b) => a.sort_order - b.sort_order || a.menu_label.localeCompare(b.menu_label),
  );

  for (const item of sorted) {
    if (!item.parent_path && !known.has(item.path)) {
      next.push({
        label: item.menu_label,
        href: item.path,
        groups: [{ title: item.menu_label, href: item.path, links: [] }],
      });
      known.add(item.path);
    }
  }

  for (const item of sorted) {
    if (!item.parent_path || known.has(item.path)) continue;
    const section =
      next.find((entry) => entry.href === item.parent_path) ??
      next.find((entry) => entry.groups.some((group) => group.href === item.parent_path)) ??
      next.find((entry) =>
        entry.groups.some((group) => group.links.some((link) => link.href === item.parent_path)),
      ) ??
      next.find(
        (entry) => item.parent_path === entry.href || item.parent_path?.startsWith(`${entry.href}/`),
      );
    if (!section) {
      next.push({
        label: item.menu_label,
        href: item.path,
        groups: [{ title: item.menu_label, href: item.path, links: [] }],
      });
      known.add(item.path);
      continue;
    }
    const group =
      section.groups.find((entry) => entry.href === item.parent_path) ??
      section.groups.find((entry) => entry.links.some((link) => link.href === item.parent_path)) ??
      section.groups[0];
    if (!group) continue;
    group.links.push({ label: item.menu_label, href: item.path });
    known.add(item.path);
  }

  return next;
}
