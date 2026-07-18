import DesktopMegaMenu from "@/components/layout/DesktopMegaMenu";
import MobileNav from "@/components/layout/MobileNav";
import type { NavSectionData } from "@/components/layout/nav-types";
import { mainNavigation } from "@/lib/data/navigation";

function toNavSections(): NavSectionData[] {
  return mainNavigation.map((section) => ({
    label: section.label,
    href: section.href,
    groups: section.groups.map((group) => ({
      title: group.title,
      href: group.href,
      links: group.links.map((link) => ({
        label: link.label,
        href: link.href,
      })),
    })),
  }));
}

export default function MainNav() {
  const sections = toNavSections();

  return (
    <>
      <DesktopMegaMenu sections={sections} />
      <MobileNav sections={sections} />
    </>
  );
}
