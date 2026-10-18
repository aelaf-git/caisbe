export type AdvisoryMember = {
  name: string;
  shortName: string;
  description: string;
  logoSrc?: string;
};

export const aboutContent = {
  seoTitle:
    "About CAISBE | Canada Africa Institute for the Sustainable Built Environment (CAISBE)",
  metaDescription:
    "Learn about CAISBE mission, accreditation, and commitment to raising professional FM standards.",
  primaryTagline: "Global Knowledge. African Impact.",
  programTagline: "Transforming Buildings. Empowering Communities",
  eyebrow: "About Us",
  title:
    "About the Canada Africa Institute for the Sustainable Built Environment (CAISBE)",
  intro:
    "The Canada Africa Institute for the Sustainable Built Environment (CAISBE) is an international knowledge, training, and innovation hub dedicated to advancing sustainable construction, resilient infrastructure, and environmentally responsible real estate development across Africa. We bring together experts, institutions, and industry leaders to address today’s most urgent challenges in the built environment—urbanization, climate change, housing affordability, green building, and digital transformation.",
  mission: {
    title: "Our Mission",
    body: "To strengthen the built environment through education, innovation, and collaboration, enabling professionals, institutions, and policymakers to design, construct, and manage sustainable, resilient, and efficient buildings and infrastructure.",
  },
  vision: {
    title: "Our Vision",
    body: "A world where every community has access to sustainable buildings, climate-resilient infrastructure, and inclusive urban systems that support the wellbeing of current and future generations.",
  },
  whatWeDo: {
    title: "What We Do",
    items: [
      "Professional certifications",
      "Corporate training & consultancy",
      "Research, standards, and industry guidelines",
      "Membership and CPD programming",
      "Events, conferences, and knowledge sharing",
      "Advocacy and Policy dialogue",
    ],
  },
  advisoryCouncil: {
    title: "Advisory Council — Honorary Members",
    intro:
      "Honorary institutional partners advising CAISBE on continental collaboration, infrastructure, and sustainable growth.",
    members: [
      {
        name: "African Union Commission",
        shortName: "AUC",
        description: "Continental policy and partnership liaison.",
        logoSrc: "/logos/African_Union.webp",
      },
      {
        name: "COMESA",
        shortName: "COMESA",
        description: "Regional economic community collaboration.",
        logoSrc: "/logos/comesa.png",
      },
      {
        name: "African Infrastructure Bank",
        shortName: "AIB",
        description: "Infrastructure and development dialogue.",
        logoSrc: "/logos/logo-aib.jpeg",
      },
      {
        name: "Green Growth Africa",
        shortName: "GGA",
        description: "Sustainability and green growth advisory.",
        logoSrc: "/logos/greengrowthafrica.jpeg",
      },
      {
        name: "African Facility Management Union (AFMU)",
        shortName: "AFMU",
        description: "Professional FM network across Africa.",
      },
    ] satisfies AdvisoryMember[],
  },
  builtEnvironment: {
    slug: "what-is-built-environment",
    title: "What is the Built Environment?",
    seoTitle: "What is the Built Environment? | CAISBE",
    metaDescription:
      "Learn what the Built Environment means and why Facility Management is essential to sustainable development across Africa.",
    paragraphs: [
      "The Built Environment refers to the human-made spaces and systems where people live, work, and interact, including buildings, infrastructure, and the services required to operate and maintain them. From a Facility Management perspective, it focuses on managing these assets safely, efficiently, sustainably, and throughout their lifecycle.",
      "In Africa, effective Facility Management is essential to support rapid urbanization, infrastructure growth, and sustainable development. By applying global best practices, innovation, and local expertise, Facility Management helps improve building performance, asset value, energy efficiency, resilience, and quality of life across communities. Through Africa–Canada collaboration, shared expertise, innovation, and capacity building can support the development of smarter, greener, and more resilient built environments that create long-term social, economic, and environmental benefits.",
    ],
  },
};
