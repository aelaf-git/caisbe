export type CertificateProgram = {
  code: string;
  title: string;
  description: string;
  slug: string;
};

export function certificatePath(slug: string) {
  return `/professional-development/${slug}`;
}

export const professionalDevelopmentContent = {
  eyebrow: "Professional Development",
  certificatesTitle: "Certificate Programs",
  certificatesIntro:
    "Explore CAISBE certificate programs designed for facility management, property management, and built environment professionals.",
  seminars: [
    {
      title: "Sustainable Facility Operations Seminar",
      description:
        "A practice-focused seminar on energy, maintenance planning, and day-to-day sustainable operations for FM teams.",
    },
    {
      title: "Workplace Experience & Soft Services Seminar",
      description:
        "Explore service quality, occupant experience, and soft-services coordination across commercial and institutional sites.",
    },
    {
      title: "Africa–Canada Built Environment Leadership Seminar",
      description:
        "Cross-border dialogue on partnership models, capacity building, and professional standards in the built environment.",
    },
    {
      title: "Health, Safety & Risk for Facility Leaders",
      description:
        "Seminar covering risk assessment, emergency readiness, and compliance essentials for facility and property managers.",
    },
  ],
  formats: {
    slug: "learning-formats",
    title: "Learning Formats",
    description:
      "CAISBE delivers certificate programs through flexible learning formats designed for working professionals, students, and organizations.",
    items: [
      {
        slug: "online-self-paced",
        title: "Online (self-paced)",
        description:
          "Study independently with structured online modules you can complete at your own pace, from anywhere.",
      },
      {
        slug: "virtual-live-classes",
        title: "Virtual Live Classes",
        description:
          "Join instructor-led live sessions online for interactive learning, discussion, and real-time support.",
      },
      {
        slug: "in-person-classroom-training",
        title: "In-Person Classroom Training",
        description:
          "Learn in a classroom setting with peers and instructors through hands-on, face-to-face training.",
      },
      {
        slug: "on-site-corporate-training",
        title: "On-site Corporate Training",
        description:
          "Bring CAISBE training to your organization with customized programs delivered on-site for your team.",
      },
    ],
  },
};

export function getLearningFormatBySlug(slug: string) {
  return professionalDevelopmentContent.formats.items.find(
    (format) => format.slug === slug,
  );
}

export function learningFormatsPath() {
  return `/professional-development/${professionalDevelopmentContent.formats.slug}`;
}

export function learningFormatPath(slug: string) {
  return `/professional-development/learning-formats/${slug}`;
}
