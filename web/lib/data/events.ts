export const eventsPages = {
  calendar: {
    slug: "calendar",
    title: "Event Calendar",
    description:
      "Explore upcoming CAISBE events, forums, conferences, and webinars connecting Africa and Canada across the built environment sector.",
    lead: "A living view of forums, conferences, webinars, and chapter activities across the CAISBE calendar.",
    highlights: [
      "Africa–Canada Built Environment Expo & Forum milestones",
      "Professional webinars and learning sessions",
      "Chapter meetings and networking gatherings",
      "Awards and recognition program dates",
    ],
    nextSteps:
      "Looking for a specific date or region? Contact us and we will point you to the right registration path.",
    ctaLabel: "Ask About Upcoming Dates",
    ctaHref: "/contact",
  },
  expo: {
    slug: "expo",
    title: "Africa–Canada Built Environment Expo & Forum",
    description:
      "A premier international platform for collaboration, innovation, and sustainable development across the built environment sector.",
    intro:
      "The Africa–Canada Built Environment Expo & Forum is a premier international platform that brings together industry leaders, policymakers, investors, academics, and professionals to foster collaboration, innovation, and sustainable development across the built environment sector.",
    objectivesTitle: "Objectives",
    objectives: [
      "Promote knowledge exchange and best practices between Africa and Canada.",
      "Showcase innovative technologies, products, and sustainable solutions.",
      "Facilitate investment, trade, and strategic partnerships.",
      "Strengthen professional networks and capacity building.",
      "Advance resilient, smart, and sustainable infrastructure across Africa.",
    ],
    participantsTitle: "Participants",
    participants:
      "Government agencies, facility and property managers, engineers, architects, urban planners, construction firms, real estate developers, technology providers, academic institutions, investors, development partners, NGOs, and industry associations from Africa and Canada.",
    ctaLabel: "Join and Participate",
    ctaHref: "/events/calendar",
  },
  conferences: {
    slug: "conferences",
    title: "Africa and Canada Related Conferences and Webinars",
    description:
      "Stay connected through conferences and webinars focused on facility management, sustainability, and built environment collaboration between Africa and Canada.",
    lead: "Conferences and webinars that keep practitioners current on FM practice, sustainability, and cross-border collaboration.",
    highlights: [
      "Technical sessions on operations, assets, and workplace",
      "Policy and sustainability dialogues",
      "Case studies from African and Canadian organizations",
      "Networking with peers, educators, and partners",
    ],
    nextSteps:
      "Propose a session topic or ask to be notified when registration opens for the next conference series.",
    ctaLabel: "Propose or Register Interest",
    ctaHref: "/contact",
  },
  "get-involved": {
    slug: "get-involved",
    title: "Get Involved",
    description:
      "Take part in CAISBE events as a speaker, volunteer, partner, or attendee. Join our community and help shape conversations that advance the sustainable built environment.",
    lead: "There are many ways to contribute—speak, volunteer, partner, or attend.",
    highlights: [
      "Speak at a forum, webinar, or chapter program",
      "Volunteer at events and support attendee experience",
      "Partner on programming or outreach",
      "Attend and grow your professional network",
    ],
    nextSteps:
      "Share your interests and we will help match you with the right opportunity.",
    ctaLabel: "Get Involved",
    ctaHref: "/contact",
  },
  sponsor: {
    slug: "sponsor",
    title: "Sponsor and Advertise",
    description:
      "Showcase your organization to an international audience of facility management and built environment professionals. Explore sponsorship, advertising, and exhibition opportunities at CAISBE events.",
    lead: "Reach facility management and built environment professionals through sponsorship, advertising, and exhibition.",
    highlights: [
      "Brand visibility at flagship forums and digital channels",
      "Exhibition and showcase opportunities",
      "Thought-leadership speaking placements",
      "Alignment with sustainability and professional development themes",
    ],
    nextSteps:
      "Tell us your goals and audience—we will outline packages that fit your organization.",
    ctaLabel: "Sponsor and Advertise",
    ctaHref: "/contact",
  },
  awards: {
    slug: "awards",
    title: "Awards and Excellence",
    description:
      "Recognizing outstanding individuals, organizations, and projects in facility and property management.",
    intro:
      "The Awards & Excellence Program recognizes outstanding individuals, organizations, and projects that demonstrate innovation, leadership, sustainability, and excellence in facility and property management.",
    categories: [
      "Facility Manager of the Year",
      "Property Manager of the Year",
      "Corporate Excellence in Facility Management",
      "Sustainability & Green Building Leadership Award",
      "Health, Safety & Risk Management Award",
      "Outstanding FM Project of the Year",
    ],
    nominate:
      "Interested in nominating an individual, organization, or project? Contact us to learn more about award categories, eligibility criteria, nomination procedures, sponsorship opportunities, and upcoming recognition programs.",
    inquiryLabel: "For award inquiries and nominations:",
    email: "info@caisbe.org",
    ctaLabel: "Contact Us",
    ctaHref: "/contact",
  },
} as const;

export type EventsSlug = keyof typeof eventsPages;

export const eventsIndexItems = [
  {
    title: eventsPages.calendar.title,
    description: eventsPages.calendar.description,
    href: "/events/calendar",
  },
  {
    title: eventsPages.expo.title,
    description: eventsPages.expo.description,
    href: "/events/expo",
  },
  {
    title: eventsPages.conferences.title,
    description: eventsPages.conferences.description,
    href: "/events/conferences",
  },
  {
    title: eventsPages["get-involved"].title,
    description: eventsPages["get-involved"].description,
    href: "/events/get-involved",
  },
  {
    title: eventsPages.sponsor.title,
    description: eventsPages.sponsor.description,
    href: "/events/sponsor",
  },
  {
    title: eventsPages.awards.title,
    description: eventsPages.awards.description,
    href: "/events/awards",
  },
];

export function getEventsPage(slug: string) {
  return eventsPages[slug as EventsSlug];
}

export function eventsSlugs() {
  return Object.keys(eventsPages) as EventsSlug[];
}
