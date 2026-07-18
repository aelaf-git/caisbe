export type PlaceholderPage = {
  slug: string;
  title: string;
  description: string;
};

function page(slug: string, title: string, description: string): PlaceholderPage {
  return { slug, title, description };
}

export const resourcesPages: PlaceholderPage[] = [
  page(
    "what-is-fm",
    "What is FM?",
    "Learn what Facility Management is and how it supports people, places, processes, and technology in the built environment.",
  ),
  page(
    "knowledge-library",
    "Knowledge Library",
    "Access articles, guides, and professional resources for facility and property management practice.",
  ),
  page(
    "research-benchmarking",
    "Research & Benchmarking",
    "Explore research insights and benchmarking resources advancing sustainable built environments.",
  ),
  page(
    "speaker-directory",
    "Speaker Directory",
    "Find experts and speakers contributing to CAISBE events, forums, and professional programs.",
  ),
  page(
    "buyers-guide",
    "Buyer's Guide",
    "Explore products, services, and solutions for facility and property management professionals.",
  ),
  page(
    "esg-facility-management",
    "ESG + Facility Management",
    "Understand how ESG principles intersect with facility management and sustainable operations.",
  ),
  page(
    "crisis-resource-center",
    "Crisis Resource Center",
    "Access guidance and resources to support facilities during crises and operational disruptions.",
  ),
  page(
    "leader-tools",
    "Leader Tools",
    "Tools and resources to support chapter leaders, volunteers, and member engagement.",
  ),
  page(
    "component-reports",
    "Component Reports",
    "Reports and updates supporting CAISBE components, chapters, and member communities.",
  ),
];

export const aboutPages: PlaceholderPage[] = [
  page(
    "what-is-built-environment",
    "What is the Built Environment?",
    "The Built Environment refers to the human-made spaces and systems where people live, work, and interact.",
  ),
  page(
    "board-of-directors",
    "Board of Directors",
    "Meet the leadership guiding CAISBE strategy, governance, and professional standards.",
  ),
  page(
    "staff",
    "Staff",
    "Get to know the CAISBE team supporting members, programs, and partnerships.",
  ),
  page(
    "governance",
    "Governance",
    "Learn how CAISBE is governed to serve members and advance the profession.",
  ),
  page(
    "volunteering",
    "Volunteering",
    "Discover ways to volunteer and contribute to CAISBE programs and community initiatives.",
  ),
  page(
    "brand-assets",
    "Brand Assets",
    "Access CAISBE brand guidelines and assets for approved partner and media use.",
  ),
];

export function getResourcePage(slug: string) {
  return resourcesPages.find((item) => item.slug === slug);
}

export function getAboutPage(slug: string) {
  return aboutPages.find((item) => item.slug === slug);
}
