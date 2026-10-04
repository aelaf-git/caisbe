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
          "Learn anytime, anywhere at your own speed. Access course materials, videos, and assessments on demand with no fixed schedule.",
        details: [
          "Learn anytime, anywhere at your own pace with 24/7 access to interactive digital materials.",
          "Enjoy flexible modules featuring microlessons, video presentations, review quizzes, practice exams, and tools like flashcards.",
        ],
        ctaLabel: "Register for a course",
        ctaHref: "/professional-development",
      },
      {
        slug: "virtual-live-classes",
        title: "Virtual Classes",
        description:
          "Live instructor-led sessions delivered online. Interact in real time via video, chat, and shared tools while joining from anywhere.",
        details: [
          "These classes are delivered as live, instructor-led sessions that blend real-time teaching with self-paced study.",
          "Interact directly with instructors through discussions, case studies, and collaborative activities.",
        ],
        ctaLabel: "Register for a course",
        ctaHref: "/professional-development",
      },
      {
        slug: "in-person-classroom-training",
        title: "In-Person Classroom Training",
        description:
          "Traditional face-to-face learning in a classroom setting. Benefit from direct interaction with instructors and peers in a focused environment.",
        details: [
          "This learning experience is led by expert instructors in a classroom setting and includes networking with peers.",
          "Available in Addis Ababa, Nairobi, South Africa, Canada, and many other locations worldwide.",
        ],
        ctaLabel: "Register for a course",
        ctaHref: "/professional-development",
      },
      {
        slug: "on-site-corporate-training",
        title: "On-Site Corporate Training",
        description:
          "Customized training delivered at your company’s location. Tailored content, flexible scheduling, and team-focused learning without travel.",
        details: [
          "Bring CAISBE experts to your workplace with programs shaped around your team’s goals, schedule, and operational context.",
        ],
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
