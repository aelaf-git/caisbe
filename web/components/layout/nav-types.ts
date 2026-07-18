export type NavLinkData = {
  label: string;
  href: string;
};

export type NavGroupData = {
  title: string;
  href: string;
  links: NavLinkData[];
};

export type NavSectionData = {
  label: string;
  href: string;
  groups: NavGroupData[];
};
