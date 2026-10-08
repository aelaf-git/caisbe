import { portalUrl } from "@/lib/api";

export const networkPages = {
  overview: {
    slug: "overview",
    title: "Overview / Networking Groups",
    description:
      "Our Networking Groups connect facility management professionals, students, industry partners, and organizations.",
    lead: "Connect with peers, students, and partners through CAISBE networking groups.",
    paragraphs: [
      "Our Networking Groups connect facility management professionals, students, industry partners, and organizations to share knowledge, exchange best practices, and build meaningful professional relationships. Through regular meetings, webinars, conferences, technical forums, and collaborative initiatives, members gain valuable insights into emerging trends, innovative technologies, workplace management, and leadership.",
    ],
    benefits: [
      "Peer learning across Africa and Canada",
      "Access to forums, webinars, and technical discussions",
      "Relationships that support career growth and partnerships",
      "Shared practice on workplace, assets, and sustainability",
    ],
    ctaLabel: "Join the Discussion Forum",
    ctaHref: "/network/discussion-forum",
  },
  "discussion-forum": {
    slug: "discussion-forum",
    title: "Discussion Forum",
    description:
      "Student discussion boards for courses, careers, mentorship, and events. Sign in to take part.",
    lead: "Sign in to the student portal to read and join discussions on courses, careers, mentorship, and events.",
    paragraphs: [],
    benefits: [],
    ctaLabel: "Sign in to discuss",
    ctaHref: portalUrl("/login?next=/forum"),
  },
} as const;

export type NetworkSlug = keyof typeof networkPages;

export const networkIndexItems = [
  {
    title: networkPages.overview.title,
    description: networkPages.overview.description,
    href: "/network/overview",
  },
  {
    title: networkPages["discussion-forum"].title,
    description: networkPages["discussion-forum"].description,
    href: "/network/discussion-forum",
  },
];

export function getNetworkPage(slug: string) {
  return networkPages[slug as NetworkSlug];
}

export function networkSlugs() {
  return Object.keys(networkPages) as NetworkSlug[];
}
