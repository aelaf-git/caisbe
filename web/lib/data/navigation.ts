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

type RawNavLink = {
  label: string;
  href?: string;
};

type RawNavGroup = {
  title: string;
  href?: string;
  links: readonly RawNavLink[];
};

type RawNavSection = {
  label: string;
  href?: string;
  groups: readonly RawNavGroup[];
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

const rawNavigation: readonly RawNavSection[] = [
  {
    label: "Membership",
    href: "/membership",
    groups: [
      {
        title: "Membership",
        href: "/membership",
        links: [
          {
            label: "Membership Overview and Benefits",
            href: "/membership/overview",
          },
          { label: "Join / Register", href: "/membership/join" },
          { label: "Manage Account (login)", href: "/login" },
          {
            label: "Types of Membership",
            href: "/membership/types",
          },
          {
            label: "Become a Member",
            href: "/membership/become-a-member",
          },
        ],
      },
      {
        title: "Network",
        href: "/network",
        links: [
          {
            label: "Overview / Networking Groups",
            href: "/network/overview",
          },
          {
            label: "Discussion Forum",
            href: "/network/discussion-forum",
          },
        ],
      },
    ],
  },
  {
    label: "Events",
    href: "/events",
    groups: [
      {
        title: "Events",
        href: "/events",
        links: [
          { label: "Event Calendar", href: "/events/calendar" },
          {
            label: "Africa–Canada Built Environment Expo & Forum",
            href: "/events/expo",
          },
          {
            label: "Conferences and Webinars",
            href: "/events/conferences",
          },
        ],
      },
      {
        title: "Get Involved",
        href: "/events/get-involved",
        links: [
          { label: "Get Involved", href: "/events/get-involved" },
          { label: "Sponsor and Advertise", href: "/events/sponsor" },
          { label: "Awards and Excellence", href: "/events/awards" },
        ],
      },
    ],
  },
  {
    label: "Professional Development",
    href: "/professional-development",
    groups: [
      {
        title: "Certificate Programs",
        href: "/professional-development",
        links: [
          {
            label: "Facilities Management Certificate (FMC)",
            href: "/professional-development/fmc",
          },
          {
            label: "Property Management Certificate (PMC)",
            href: "/professional-development/pmc",
          },
          {
            label: "Condominium/Cooperative Housing Management (CHMC)",
            href: "/professional-development/chmc",
          },
          {
            label: "Health & Safety Certificate (HSC)",
            href: "/professional-development/hsc",
          },
          {
            label: "Energy Efficiency & Building Energy Management (CEEBM)",
            href: "/professional-development/ceebm",
          },
          {
            label: "Real Estate Investment & Property Valuation (RIPVC)",
            href: "/professional-development/ripvc",
          },
          {
            label: "Smart Real Estate Technologies",
            href: "/professional-development/sret",
          },
        ],
      },
      {
        title: "Learning Formats",
        href: "/professional-development/learning-formats",
        links: [
          {
            label: "Online (self-paced)",
            href: "/professional-development/learning-formats/online-self-paced",
          },
          {
            label: "Virtual Live Classes",
            href: "/professional-development/learning-formats/virtual-live-classes",
          },
          {
            label: "In-Person Classroom Training",
            href: "/professional-development/learning-formats/in-person-classroom-training",
          },
          {
            label: "On-site Corporate Training",
            href: "/professional-development/learning-formats/on-site-corporate-training",
          },
        ],
      },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    groups: [
      {
        title: "Resources",
        href: "/resources",
        links: [
          { label: "Careers & Job Board", href: "/careers" },
          {
            label: "Advocacy and Government",
            href: "/resources/advocacy-government-affairs",
          },
          { label: "What is FM?", href: "/resources/what-is-fm" },
          { label: "Knowledge Library", href: "/resources/knowledge-library" },
          {
            label: "Research & Benchmarking",
            href: "/resources/research-benchmarking",
          },
          { label: "Speaker Directory", href: "/resources/speaker-directory" },
          { label: "Buyer's Guide", href: "/resources/buyers-guide" },
        ],
      },
      {
        title: "Members Corner",
        href: "/resources/members-corner",
        links: [
          { label: "CAISBE Magazine", href: "/resources/magazine" },
          { label: "YouTube", href: "/resources/youtube" },
          { label: "Podcast", href: "/resources/podcast" },
          { label: "Blog", href: "/resources/blog" },
        ],
      },
    ],
  },
  {
    label: "About CAISBE",
    href: "/about",
    groups: [
      {
        title: "About the Association",
        href: "/about",
        links: [
          { label: "About Us", href: "/about" },
          {
            label: "What is the Built Environment?",
            href: "/about/what-is-built-environment",
          },
          { label: "Our Leadership", href: "/about#leadership" },
          { label: "Board of Directors", href: "/about/board-of-directors" },
          { label: "Staff", href: "/about/staff" },
          { label: "Governance", href: "/about/governance" },
          { label: "Volunteering", href: "/about/volunteering" },
          { label: "Brand Assets", href: "/about/brand-assets" },
        ],
      },
    ],
  },
];

function enrichNavigation(): NavSection[] {
  return rawNavigation.map((section) => ({
    label: section.label,
    href: section.href ?? buildPath(section.label),
    groups: section.groups.map((group) => ({
      title: group.title,
      href: group.href ?? linkPath(group.title, section.label),
      links: group.links.map((link) => ({
        label: link.label,
        href: link.href ?? linkPath(link.label, section.label, group.title),
      })),
    })),
  }));
}

export const mainNavigation = enrichNavigation();
