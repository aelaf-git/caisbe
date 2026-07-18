export type MembershipCategory = {
  title: string;
  description: string;
};

export const membershipPages = {
  overview: {
    slug: "overview",
    title: "Membership Overview and Benefits",
    description:
      "Facility Management is a multidisciplinary profession that ensures the efficient operation, maintenance, safety, and sustainability of the built environment.",
    paragraphs: [
      "Facility Management is a multidisciplinary profession that ensures the efficient operation, maintenance, safety, and sustainability of the built environment. It integrates people, places, processes, and technology to support organizational objectives. FM encompasses building operations, asset management, health and safety, space planning, and environmental sustainability.",
    ],
  },
  join: {
    slug: "join",
    title: "Join CAISBE",
    eyebrow: "Join / Register",
    description:
      "Become part of a growing community of facility management professionals, students, and organizations.",
    paragraphs: [
      "Become part of a growing community of facility management professionals, students, and organizations dedicated to advancing excellence in the built environment in Africa and beyond. Whether you are beginning your career, expanding your professional network, or representing an organization, our membership provides access to training, industry insights, and networking opportunities.",
      "Register today and take the next step in your professional journey with the Facility Management Association.",
    ],
  },
  types: {
    slug: "types",
    title: "Membership Categories",
    eyebrow: "Type of Membership",
    description:
      "Explore CAISBE membership categories for students, professionals, organizations, and institutions.",
    items: [
      {
        title: "Student Membership",
        description:
          "Designed for students pursuing studies in Facility Management, Engineering, Architecture, Construction, Real Estate, or related fields. Members gain access to career development resources, networking opportunities, training discounts, mentorship, and educational events.",
      },
      {
        title: "Professional Membership",
        description:
          "For individuals working in Facility Management and the built environment. Benefits include professional development, industry networking, certification opportunities, technical resources, conferences, leadership opportunities, and member-exclusive events.",
      },
      {
        title: "Corporate Membership",
        description:
          "For organizations committed to excellence in Facility Management. Corporate members enjoy organizational visibility, staff development opportunities, sponsorship and partnership benefits, access to industry research, networking, recruitment support, and discounted training for employees.",
      },
      {
        title: "Senior Member / Fellow",
        description:
          "For leadership-level professionals who have demonstrated distinguished service and impact in Facility Management and the sustainable built environment.",
      },
      {
        title: "Institutional Member",
        description:
          "For universities, agencies, government bodies, and NGOs advancing education, research, and practice in Facility Management.",
      },
    ] satisfies MembershipCategory[],
  },
  "become-a-member": {
    slug: "become-a-member",
    title: "Become a Member",
    description:
      "Join CAISBE or renew your membership to access training, networking, and professional resources.",
    joinLabel: "Join Now",
    joinHref: "/register",
    renewLabel: "Renew Membership",
    renewHref: "/login",
  },
} as const;

export type MembershipSlug = keyof typeof membershipPages;

export const membershipIndexItems = [
  {
    title: membershipPages.overview.title,
    description: membershipPages.overview.description,
    href: "/membership/overview",
  },
  {
    title: "Join / Register",
    description: membershipPages.join.description,
    href: "/membership/join",
  },
  {
    title: membershipPages.types.title,
    description: membershipPages.types.description,
    href: "/membership/types",
  },
  {
    title: membershipPages["become-a-member"].title,
    description: membershipPages["become-a-member"].description,
    href: "/membership/become-a-member",
  },
];

export function getMembershipPage(slug: string) {
  if (!(slug in membershipPages)) {
    return undefined;
  }
  return membershipPages[slug as MembershipSlug];
}

export function membershipSlugs() {
  return Object.keys(membershipPages) as MembershipSlug[];
}
