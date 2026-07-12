import { buildPath, linkPath } from "@/lib/routes";

export type NavLink = {
  label: string;
  href: string;
};

export type NavGroup = {
  title: string;
  href: string;
  links: NavLink[];
};

export type NavSection = {
  label: string;
  href: string;
  groups: NavGroup[];
};

export type SimpleLink = {
  label: string;
  href: string;
};

export const quickLinks: SimpleLink[] = [
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
  { label: "My Account", href: "/my-account" },
];

export const utilityLinks: SimpleLink[] = [
  { label: "About", href: "/about" },
  { label: "Store / Bookstore", href: "/store" },
  { label: "News & Announcements", href: "/news" },
  { label: "Contact", href: "/contact" },
];

const rawNavigation = [
  {
    label: "Membership",
    groups: [
      {
        title: "Membership",
        links: [
          { label: "Membership Overview / Benefits" },
          { label: "Join / Register" },
          { label: "Manage Account (login)" },
          {
            label:
              "Types of Membership (Professional, Associate, Young Professionals, Students, Retired, etc.)",
          },
        ],
      },
      {
        title: "Network",
        links: [
          { label: "Overview / Networking Groups" },
          { label: "Local Chapters (with interactive Local Chapter Map)" },
          { label: "Councils" },
          { label: "Communities" },
          { label: "Military (military.ifma.org)" },
          { label: "Discussion Forum (engage.ifma.org)" },
          { label: "Member Directory" },
          { label: "Young Professionals" },
        ],
      },
      {
        title: "Regional Sites and Affiliates",
        links: [
          { label: "IFMA EMEA" },
          { label: "IFMA LATAM" },
          { label: "IFMA Foundation" },
        ],
      },
    ],
  },
  {
    label: "Events",
    groups: [
      {
        title: "Events",
        links: [
          { label: "Event Calendar" },
          { label: "World Workplace Conference & Expo (major annual event)" },
          { label: "Other Conferences, Webinars, and Regional Events" },
        ],
      },
      {
        title: "Participate",
        links: [
          { label: "Speaking Opportunities" },
          { label: "Advertise, Exhibit or Sponsor" },
          { label: "Awards of Excellence" },
          { label: "Event Marketing Kit" },
          { label: "Events News Center" },
        ],
      },
    ],
  },
  {
    label: "Professional Development",
    groups: [
      {
        title: "Training",
        links: [
          { label: "Essentials of FM" },
          { label: "CFM Knowledge Workshop" },
          { label: "Individual Courses" },
          { label: "Online Training" },
          { label: "Partner Courses" },
          { label: "Local Training Providers / Affiliates" },
          { label: "Find Your Training" },
          { label: "Access My Training (fm.training)" },
          { label: "Webinars" },
        ],
      },
      {
        title: "Credentials",
        links: [
          { label: "Overview" },
          { label: "FMP – Facility Management Professional" },
          { label: "SFP – Sustainability Facility Professional" },
          { label: "CFM – Certified Facility Manager" },
          { label: "Manage My Credentials" },
          { label: "Credential Registry / Verification" },
        ],
      },
      {
        title: "Government",
        links: [{ label: "GSA Schedule (U.S.)" }],
      },
    ],
  },
  {
    label: "Resources",
    groups: [
      {
        title: "Resources",
        links: [
          { label: "What is FM?" },
          { label: "Knowledge Library" },
          { label: "Research & Benchmarking" },
          { label: "Job Board (jobboard.ifma.org)" },
          { label: "Speaker Directory" },
          { label: "Buyer's Guide (onlinefmguide.com)" },
          { label: "ESG + Facility Management" },
          { label: "Crisis Resource Center / Wildfire Crisis Resource Hub" },
          { label: "Advocacy & Government Affairs" },
        ],
      },
      {
        title: "Tools for Members / Chapters",
        links: [
          { label: "Leader Tools" },
          { label: "Component Reports" },
          { label: "FMJ Magazine" },
          { label: "Blog" },
          { label: "Podcast" },
          { label: "YouTube" },
        ],
      },
    ],
  },
  {
    label: "About CAISBE",
    groups: [
      {
        title: "About the Association",
        links: [
          { label: "About CAISBE" },
          { label: "What is FM?" },
          { label: "Board of Directors" },
          { label: "Staff" },
          { label: "Governance" },
          { label: "Volunteering" },
          { label: "Brand Assets" },
        ],
      },
    ],
  },
] as const;

function enrichNavigation(): NavSection[] {
  return rawNavigation.map((section) => ({
    label: section.label,
    href: buildPath(section.label),
    groups: section.groups.map((group) => ({
      title: group.title,
      href: linkPath(group.title, section.label),
      links: group.links.map((link) => ({
        label: link.label,
        href: linkPath(link.label, section.label, group.title),
      })),
    })),
  }));
}

export const mainNavigation = enrichNavigation();
