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
  certificates: [
    {
      slug: "fmc",
      code: "FMC",
      title: "Facilities Management Certificate (FMC)",
      description:
        "This certificate provides foundational knowledge and practical skills for managing modern facilities. Participants learn how to oversee building operations, maintenance planning, space management, vendor coordination, and sustainability practices to ensure efficient, safe, and cost-effective facility performance.",
    },
    {
      slug: "pmc",
      code: "PMC",
      title: "Property Management Certificate (PMC)",
      description:
        "This program equips learners with essential skills in property operations, leasing, tenant relations, rent management, maintenance coordination, and legal compliance. Ideal for those managing residential, commercial, or mixed-use properties in rapidly growing real estate markets.",
    },
    {
      slug: "chmc",
      code: "CHMC",
      title: "Condominium/Cooperative Housing Management Certificate (CHMC)",
      description:
        "This certificate focuses on the unique governance, financial management, maintenance, and community leadership skills needed to manage condominium and cooperative housing developments. It covers owner/tenant coordination, board relations, budgeting, and conflict resolution.",
    },
    {
      slug: "hsc",
      code: "HSC",
      title: "Health & Safety Certificate for FM Professionals (HSC)",
      description:
        "Designed for facility and property management professionals, this certificate covers workplace safety standards, risk assessment, emergency preparedness, hazard control, and compliance with health and safety regulations. Graduates gain the skills to create safe and compliant building environments.",
    },
    {
      slug: "ceebm",
      code: "CEEBM",
      title: "Certificate in Energy Efficiency & Building Energy Management (CEEBM)",
      description:
        "Participants learn practical strategies for reducing building energy consumption through audits, energy monitoring, HVAC optimization, lighting upgrades, and sustainable design principles. The program emphasizes cost-effective approaches suitable for developing and advanced markets.",
    },
    {
      slug: "ripvc",
      code: "RIPVC",
      title: "Real Estate Investment & Property Valuation Certificate (RIPVC)",
      description:
        "This certificate introduces learners to investment analysis, valuation techniques, market assessment, and financial modeling for real estate assets. Participants gain skills in estimating property value, analyzing risk, and evaluating investment opportunities in emerging and mature property markets.",
    },
    {
      slug: "sret",
      code: "SRET",
      title: "Certificate in Smart Real Estate Technologies",
      description:
        "A forward-looking program covering digital tools that are transforming real estate, including smart building systems, IoT sensors, building automation, AI-powered valuation tools, mobile property management platforms, and blockchain-based land registration solutions.",
    },
  ] satisfies CertificateProgram[],
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

export function getCertificateBySlug(slug: string) {
  return professionalDevelopmentContent.certificates.find(
    (certificate) => certificate.slug === slug,
  );
}

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
