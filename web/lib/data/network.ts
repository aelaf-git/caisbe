export const networkPages = {
  overview: {
    slug: "overview",
    title: "Overview / Networking Groups",
    description:
      "Our Networking Groups connect facility management professionals, students, industry partners, and organizations.",
    paragraphs: [
      "Our Networking Groups connect facility management professionals, students, industry partners, and organizations to share knowledge, exchange best practices, and build meaningful professional relationships. Through regular meetings, webinars, conferences, technical forums, and collaborative initiatives, members gain valuable insights into emerging trends, innovative technologies, workplace management, and leadership.",
    ],
  },
  "discussion-forum": {
    slug: "discussion-forum",
    title: "Discussion Forum",
    description:
      "The African Facility Management Discussion Forum connects professionals across Africa and beyond.",
    paragraphs: [
      "The African Facility Management Discussion Forum is a collaborative platform that brings together facility management professionals, industry experts, academics, policymakers, and organizations from across Africa and beyond. The forum promotes knowledge sharing, professional networking, and cross-sector collaboration to address emerging challenges and opportunities in the built environment.",
      "Members engage in discussions on facility operations, asset management, sustainability, workplace innovation, healthcare, education, commercial real estate, infrastructure, government facilities, and industrial sectors. Together, we foster best practices, innovation, and professional excellence to advance the Facility Management profession across Africa.",
    ],
    ctaLabel: "Engage CAISBE",
    ctaHref: "/engage",
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
