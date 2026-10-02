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
      "The African Facility Management Discussion Forum connects professionals across Africa and beyond.",
    lead: "A collaborative forum for professionals, experts, academics, and organizations across Africa and beyond.",
    paragraphs: [
      "The African Facility Management Discussion Forum is a collaborative platform that brings together facility management professionals, industry experts, academics, policymakers, and organizations from across Africa and beyond. The forum promotes knowledge sharing, professional networking, and cross-sector collaboration to address emerging challenges and opportunities in the built environment.",
      "Members engage in discussions on facility operations, asset management, sustainability, workplace innovation, healthcare, education, commercial real estate, infrastructure, government facilities, and industrial sectors. Together, we foster best practices, innovation, and professional excellence to advance the Facility Management profession across Africa.",
    ],
    benefits: [
      "Cross-sector conversations on real operational challenges",
      "Visibility for research, practice, and policy ideas",
      "Introductions to peers and potential collaborators",
      "A pathway into broader CAISBE membership and events",
    ],
    ctaLabel: "Engage CAISBE",
    ctaHref: "/contact",
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
