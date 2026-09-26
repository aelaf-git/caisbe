export type LeadershipPerson = {
  role: string;
  name: string;
  credentials: string;
  email: string;
};

export type AdvisoryMember = {
  name: string;
  shortName: string;
  description: string;
};

export const aboutContent = {
  seoTitle:
    "About CAISBE | Canada Africa Institute for the Sustainable Built Environment (CAISBE)",
  metaDescription:
    "Learn about CAISBE mission, leadership, accreditation, and commitment to raising professional FM standards.",
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
  leadership: {
    title: "Our Leadership",
    intro:
      "CAISBE is led by practitioners and specialists advancing facility management, membership, regional coordination, advocacy, and technology.",
    people: [
      {
        role: "Executive Director",
        name: "Mr. Dawit Zegeyea",
        credentials: "MCOM, CFM, FMP, SFP, SMT",
        email: "dawit.zegeyea@caisbe.org",
      },
      {
        role: "Membership Development and Support",
        name: "Mr. Ramazani Mangaals",
        credentials: "BA, FMP",
        email: "ramazani.mangaals@caisbe.org",
      },
      {
        role: "East Africa Secretariat Office",
        name: "Mr. Okey Simisola",
        credentials: "BSc, MA",
        email: "okey.simisola@caisbe.org",
      },
      {
        role: "Advocacy and International Relations",
        name: "Mr. Yared Alemu",
        credentials: "Dip, International Cooperation",
        email: "yared.alemu@caisbe.org",
      },
      {
        role: "IT Operations and Service Desk",
        name: "Mr. Aelaf Eskinder",
        credentials: "BSc, Software Engineering",
        email: "aelaf.eskinder@caisbe.org",
      },
    ] satisfies LeadershipPerson[],
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
      },
      {
        name: "COMESA",
        shortName: "COMESA",
        description: "Regional economic community collaboration.",
      },
      {
        name: "African Infrastructure Bank",
        shortName: "AIB",
        description: "Infrastructure and development dialogue.",
      },
      {
        name: "Green Growth Africa",
        shortName: "GGA",
        description: "Sustainability and green growth advisory.",
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
