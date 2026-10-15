import DesktopMegaMenu from "@/components/layout/DesktopMegaMenu";
import MobileNav from "@/components/layout/MobileNav";
import type { NavSectionData } from "@/components/layout/nav-types";
import {
  courseProgramPath,
  fetchPublishedCourses,
  type Course,
} from "@/lib/api";
import { mainNavigation, utilityLinks } from "@/lib/data/navigation";
import {
  localizeNavSections,
  localizeUtilityLinks,
  type Locale,
} from "@/lib/i18n";
import { fetchSiteNav, mergeSiteNav } from "@/lib/sitePages";

function toNavSections(courses: Course[]): NavSectionData[] {
  const courseLinks = courses.map((course) => ({
    label: course.title,
    href: courseProgramPath(course.slug),
  }));

  return mainNavigation.map((section) => ({
    label: section.label,
    href: section.href,
    groups: section.groups.map((group) => {
      const isCertificatePrograms =
        section.label === "Professional Development" &&
        group.title === "Certificate Programs";
      return {
        title: group.title,
        href: group.href,
        links: isCertificatePrograms
          ? courseLinks
          : group.links.map((link) => ({
              label: link.label,
              href: link.href,
            })),
      };
    }),
  }));
}

export default async function MainNav({
  locale = "en",
}: {
  locale?: Locale;
}) {
  let courses: Course[] = [];
  try {
    courses = await fetchPublishedCourses();
  } catch {
    courses = [];
  }
  const merged = mergeSiteNav(toNavSections(courses), await fetchSiteNav());
  const sections = localizeNavSections(merged, locale);
  const localizedUtility = localizeUtilityLinks(utilityLinks, locale);

  return (
    <>
      <DesktopMegaMenu sections={sections} />
      <MobileNav
        sections={sections}
        utilityLinks={localizedUtility}
        locale={locale}
      />
    </>
  );
}
