export type CertificateProgram = {
  code: string;
  title: string;
  description: string;
  slug: string;
};

export type LearningFormat = {
  slug: string;
  title: string;
  description: string;
  details: string[];
  ctaLabel: string;
  ctaHref: string;
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
    educationOptionsTitle: "Education Options",
    educationOptionsIntro:
      "Choose the learning format that fits your schedule, location, and goals.",
    items: [
      {
        slug: "online-self-paced",
        title: "Online (Self-Paced)",
        description:
          "Learn anytime, anywhere at your own pace with 24/7 access to interactive digital materials—no fixed schedule.",
        details: [
          "Modules include microlessons, video presentations, review quizzes, practice exams, and tools like flashcards.",
        ],
        ctaLabel: "Register for a course",
        ctaHref: "/professional-development",
      },
      {
        slug: "virtual-live-classes",
        title: "Virtual Classes",
        description:
          "Live instructor-led sessions online—join from anywhere and interact in real time via video, chat, and shared tools.",
        details: [
          "Sessions blend live teaching with self-paced study through discussions, case studies, and collaborative activities.",
        ],
        ctaLabel: "Register for a course",
        ctaHref: "/professional-development",
      },
      {
        slug: "in-person-classroom-training",
        title: "In-Person Classroom Training",
        description:
          "Face-to-face classroom learning with expert instructors, peer networking, and a focused environment.",
        details: [
          "Available in Addis Ababa, Nairobi, South Africa, Canada, and many other locations worldwide.",
        ],
        ctaLabel: "Register for a course",
        ctaHref: "/professional-development",
      },
      {
        slug: "on-site-corporate-training",
        title: "On-Site Corporate Training",
        description:
          "Customized training at your company’s location—tailored content, flexible scheduling, and team-focused learning without travel.",
        details: [],
        ctaLabel: "Contact us for details",
        ctaHref: "/contact",
      },
    ] satisfies LearningFormat[],
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
