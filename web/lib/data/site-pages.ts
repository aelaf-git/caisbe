export type PlaceholderPage = {
  slug: string;
  title: string;
  description: string;
};

export type TopicSection = {
  title: string;
  body?: string;
  items?: string[];
};

export type TopicPage = PlaceholderPage & {
  lead: string;
  sections: TopicSection[];
  ctaLabel?: string;
  ctaHref?: string;
};

function topic(
  slug: string,
  title: string,
  description: string,
  lead: string,
  sections: TopicSection[],
  cta?: { label: string; href: string },
): TopicPage {
  return {
    slug,
    title,
    description,
    lead,
    sections,
    ctaLabel: cta?.label,
    ctaHref: cta?.href,
  };
}

export const resourcesPages: TopicPage[] = [
  topic(
    "fm-resources",
    "FM Resources",
    "Curated facility management resources, guides, and professional tools for the CAISBE community.",
    "A dedicated library of facility management resources is being prepared for members and partners.",
    [
      {
        title: "Coming soon",
        body: "This section will host FM practice resources in one place. Content is under construction—thank you for your patience.",
      },
    ],
    { label: "Contact Us", href: "/contact" },
  ),
  topic(
    "knowledge-library",
    "Knowledge Library",
    "Access articles, guides, and professional resources for facility and property management practice.",
    "A curated collection of articles, guides, and practice notes for facility and property professionals.",
    [
      {
        title: "What you will find",
        items: [
          "Practice briefs on operations, workplace, and sustainability",
          "Event summaries and expert perspectives",
          "Member-oriented tools and reading lists",
        ],
      },
      {
        title: "Request access",
        body: "Many library materials are shared with members and program participants. Contact us to request a reading list or chapter resource pack.",
      },
    ],
    { label: "Contact the Library", href: "/contact" },
  ),
  topic(
    "buyers-guide",
    "Buyer's Guide",
    "Explore products, services, and solutions for facility and property management professionals.",
    "A starting point for discovering products and services used by facility and property teams.",
    [
      {
        title: "Solution areas",
        items: [
          "Building systems and maintenance technology",
          "Cleaning, soft services, and workplace amenities",
          "Energy, sustainability, and smart-building tools",
          "Training, consulting, and professional services",
        ],
      },
      {
        title: "List your organization",
        body: "Providers serving FM markets in Africa and Canada can inquire about visibility through CAISBE channels and events.",
      },
    ],
    { label: "Inquire About Listing", href: "/contact" },
  ),
  topic(
    "esg-facility-management",
    "ESG + Facility Management",
    "Understand how ESG principles intersect with facility management and sustainable operations.",
    "Environmental, social, and governance priorities show up daily in how facilities are run, measured, and improved.",
    [
      {
        title: "FM and ESG intersection",
        items: [
          "Energy efficiency, water, and waste reduction",
          "Healthy indoor environments and equity of access",
          "Transparent reporting and responsible procurement",
          "Climate resilience and risk awareness",
        ],
      },
      {
        title: "Build capability",
        body: "Use CAISBE learning programs and events to connect ESG strategy with operational practice.",
      },
    ],
    { label: "View Learning Programs", href: "/professional-development" },
  ),
  topic(
    "crisis-resource-center",
    "Crisis Resource Center",
    "Access guidance and resources to support facilities during crises and operational disruptions.",
    "Guidance to help facility teams prepare for and respond to disruptions that affect people, operations, and assets.",
    [
      {
        title: "Resource themes",
        items: [
          "Continuity planning and essential services",
          "Communication with occupants and stakeholders",
          "Health, safety, and emergency coordination",
          "Recovery, lessons learned, and improvement cycles",
        ],
      },
      {
        title: "Need support?",
        body: "Contact CAISBE for referrals, peer connections, or to share crisis-ready materials with the community.",
      },
    ],
    { label: "Contact Support", href: "/contact" },
  ),
  topic(
    "leader-tools",
    "Leader Tools",
    "Tools and resources to support chapter leaders, volunteers, and member engagement.",
    "Practical tools for chapter leaders and volunteers who grow local CAISBE communities.",
    [
      {
        title: "Included tool types",
        items: [
          "Meeting and event planning checklists",
          "Member engagement ideas and templates",
          "Onboarding notes for new volunteers",
          "Reporting and communication prompts",
        ],
      },
      {
        title: "Get the pack",
        body: "Leaders can request current templates and orientation materials from the institute team.",
      },
    ],
    { label: "Request Leader Tools", href: "/contact" },
  ),
  topic(
    "component-reports",
    "Component Reports",
    "Reports and updates supporting CAISBE components, chapters, and member communities.",
    "Updates that help components and chapters share progress, priorities, and learning across the network.",
    [
      {
        title: "What reports support",
        items: [
          "Chapter activity and membership snapshots",
          "Program outcomes and event summaries",
          "Shared priorities across regions",
        ],
      },
      {
        title: "Submit an update",
        body: "Component leaders can send activity highlights for inclusion in institute summaries.",
      },
    ],
    { label: "Share a Report", href: "/contact" },
  ),
];

export const aboutPages: TopicPage[] = [
  topic(
    "what-is-built-environment",
    "What is the Built Environment?",
    "The Built Environment refers to the human-made spaces and systems where people live, work, and interact.",
    "The Built Environment refers to the human-made spaces and systems where people live, work, and interact.",
    [],
  ),
  topic(
    "board-of-directors",
    "Board of Directors",
    "Meet the leadership guiding CAISBE strategy, governance, and professional standards.",
    "The Board guides CAISBE strategy, stewardship, and professional standards across Africa–Canada collaboration.",
    [
      {
        title: "Board focus",
        items: [
          "Strategic direction and institutional integrity",
          "Oversight of programs, partnerships, and finances",
          "Advancing professional excellence in the built environment",
        ],
      },
      {
        title: "Leadership areas",
        items: [
          "Chair and executive officers",
          "Program and membership stewardship",
          "Regional and partnership liaison roles",
        ],
      },
      {
        title: "Connect with leadership",
        body: "For board correspondence, nominations, or governance questions, contact the institute office.",
      },
    ],
    { label: "Contact the Board Office", href: "/contact" },
  ),
  topic(
    "staff",
    "Staff",
    "Get to know the CAISBE team supporting members, programs, and partnerships.",
    "CAISBE staff support members, programs, events, and day-to-day institute operations.",
    [
      {
        title: "How the team supports you",
        items: [
          "Membership onboarding and renewals",
          "Professional development coordination",
          "Events, communications, and partner relations",
          "Office support across Canada and Africa locations",
        ],
      },
      {
        title: "Reach the team",
        body: "Use the Contact page for general inquiries, or email the office listed for your region.",
      },
    ],
    { label: "Contact Staff", href: "/contact" },
  ),
  topic(
    "governance",
    "Governance",
    "Learn how CAISBE is governed to serve members and advance the profession.",
    "CAISBE is governed to serve members, protect institutional trust, and advance the profession responsibly.",
    [
      {
        title: "Governance principles",
        items: [
          "Transparency and accountability to members",
          "Clear roles for board, staff, and volunteers",
          "Ethical stewardship of programs and partnerships",
          "Alignment with mission and long-term impact",
        ],
      },
      {
        title: "Policies and questions",
        body: "Review related policies such as our Privacy Policy, and contact us for governance documentation requests.",
      },
    ],
    { label: "Privacy Policy", href: "/privacy-policy" },
  ),
  topic(
    "volunteering",
    "Volunteering",
    "Discover ways to volunteer and contribute to CAISBE programs and community initiatives.",
    "Volunteers help deliver events, mentor peers, support chapters, and grow the professional community.",
    [
      {
        title: "Ways to contribute",
        items: [
          "Event and forum support",
          "Chapter leadership and member engagement",
          "Mentoring and knowledge sharing",
          "Committees for programs, awards, and outreach",
        ],
      },
      {
        title: "Get started",
        body: "Tell us your interests and availability—we will match you with opportunities that fit your skills.",
      },
    ],
    { label: "Volunteer With CAISBE", href: "/contact" },
  ),
  topic(
    "brand-assets",
    "Brand Assets",
    "Access CAISBE brand guidelines and assets for approved partner and media use.",
    "Approved partners and media can request CAISBE brand assets and usage guidance.",
    [
      {
        title: "Available on request",
        items: [
          "Primary logo files for digital and print",
          "Color and typography guidance",
          "Co-branding notes for events and partnerships",
        ],
      },
      {
        title: "Usage expectations",
        items: [
          "Do not alter logo proportions or colors without approval",
          "Keep clear space around the mark",
          "Use assets only for approved CAISBE-related communications",
        ],
      },
      {
        title: "Request assets",
        body: "Email the communications team with your organization name, intended use, and deadline.",
      },
    ],
    { label: "Request Brand Assets", href: "/contact" },
  ),
];

export function getResourcePage(slug: string) {
  return resourcesPages.find((item) => item.slug === slug);
}

export function getAboutPage(slug: string) {
  return aboutPages.find((item) => item.slug === slug);
}
