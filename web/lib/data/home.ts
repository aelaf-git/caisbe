import { buildPath, linkPath } from "@/lib/routes";

export const siteName = "CAISBE";
export const siteFullName =
  "Canada Africa Institute for the Sustainable Built Environment";

export const siteTagline = "Transforming Buildings. Empowering Communities.";

export const heroIntro =
  "CAISBE prepares the next generation of facility and property management professionals to lead sustainable transformation across buildings and infrastructure in Africa — leveraging Canadian expertise, global standards, and green innovation.";

export const heroCta =
  "Join CAISBE for world-class education, industry standards, and professional membership.";

export const stats = [
  { value: "12+", label: "Certified courses" },
  { value: "25+", label: "Aggregate years of experience in the field" },
  {
    value: "120+",
    label: "African based trade and professionals associations",
  },
  { value: "1520+", label: "Members & counting more daily" },
];

export const aboutContent = {
  eyebrow: "Years Of Undefeated Success",
  title: siteTagline,
  description:
    "The Canada Africa Institute for the Sustainable Built Environment (CAISBE) was established to bridge the knowledge, technology, and capacity gaps between Canada and Africa in the fields of sustainable construction, resilient infrastructure, real estate development, and environmental stewardship. As African cities expand rapidly and Canada advances in green technologies and climate-resilient design, CAISBE provides a collaborative platform where best practices, research, and professional training come together.",
  cta: "Work With Us",
};

export const certificatesIntro = {
  title: "Build Your FM Team",
  subtitle: "Quality Educational Certification programs",
  cta: "View All",
};

export const certificates = [
  {
    code: "FMC",
    title: "Facilities Management Certificate (FMC)",
    description:
      "This certificate provides foundational knowledge and practical skills for managing modern facilities. Participants learn how to oversee building operations, maintenance planning, space management, vendor coordination, and sustainability practices to ensure efficient, safe, and cost-effective facility performance.",
  },
  {
    code: "PMC",
    title: "Property Management Certificate (PMC)",
    description:
      "This program equips learners with essential skills in property operations, leasing, tenant relations, rent management, maintenance coordination, and legal compliance. Ideal for those managing residential, commercial, or mixed-use properties in rapidly growing real estate markets.",
  },
  {
    code: "CHMC",
    title: "Condominium/Cooperative Housing Management Certificate (CHMC)",
    description:
      "This certificate focuses on the unique governance, financial management, maintenance, and community leadership skills needed to manage condominium and cooperative housing developments. It covers owner/tenant coordination, board relations, budgeting, and conflict resolution.",
  },
  {
    code: "HSC",
    title: "Health & Safety Certificate for FM Professionals (HSC)",
    description:
      "Designed for facility and property management professionals, this certificate covers workplace safety standards, risk assessment, emergency preparedness, hazard control, and compliance with health and safety regulations. Graduates gain the skills to create safe and compliant building environments.",
  },
  {
    code: "CEEBM",
    title: "Certificate in Energy Efficiency & Building Energy Management (CEEBM)",
    description:
      "Participants learn practical strategies for reducing building energy consumption through audits, energy monitoring, HVAC optimization, lighting upgrades, and sustainable design principles. The program emphasizes cost-effective approaches suitable for developing and advanced markets.",
  },
  {
    code: "RIPVC",
    title: "Real Estate Investment & Property Valuation Certificate (RIPVC)",
    description:
      "This certificate introduces learners to investment analysis, valuation techniques, market assessment, and financial modeling for real estate assets. Participants gain skills in estimating property value, analyzing risk, and evaluating investment opportunities in emerging and mature property markets.",
  },
  {
    code: "SRET",
    title: "Certificate in Smart Real Estate Technologies",
    description:
      "A forward-looking program covering digital tools that are transforming real estate, including smart building systems, IoT sensors, building automation, AI-powered valuation tools, mobile property management platforms, and blockchain-based land registration solutions.",
  },
];

export const sustainabilityContent = {
  title: "Committed To Keep People, Built Environment Healthy & Safe",
  description:
    "Building the skills to create safe and compliant building environments",
  cta: "Get in Touch",
};

export const bestPractices = {
  title: "We Follow Best Practices",
  description: "We follow best practices and scaling it up to Africa",
  items: [
    "Sustainability",
    "Project On Time",
    "Modern Technology",
    "Local Innovative Knowledge",
  ],
};

export const globalMission = {
  title: "Transform Communities Across the Globe",
  description:
    "CAISBE prepares the next generation of facility and property management professionals to lead sustainable transformation across buildings and infrastructure in Africa — leveraging Canadian expertise, global standards, and green innovation.",
};

export const offices = [
  {
    region: "Canada",
    address: "815-4AVE SW, CALGARY Alberta, T2P 5N7",
  },
  {
    region: "United States",
    address: "2367 Speers Road, Brampton",
  },
  {
    region: "Africa",
    address: "Africa Union, Mexico road, Addis Ababa",
  },
];

export const teamIntro = {
  eyebrow: "About Us",
  title: "We Are CAISBE",
};

export const teamMembers = [
  { name: "Lara Smith", role: "Leadership" },
  { name: "John Doe", role: "Leadership" },
];

export const aboutCta = {
  title: siteTagline,
  description: heroCta,
  cta: "View Projects",
};

export const projects = [
  { name: "Gate Bridge" },
  { name: "Enix Lawyer Building" },
  { name: "Ridge" },
];

export const testimonialsIntro = {
  eyebrow: "Testimonials",
  title: "What Our Course Participants Say",
};

export const testimonials = [
  {
    quote:
      "I had no idea what facility management really was until this course. In just 8 weeks, it opened my eyes to an exciting career I never considered. Perfect starting point!",
    name: "Alice Howard",
    role: "Course Participant",
  },
  {
    quote:
      "As a complete beginner, this intro course was exactly what I needed. Clear, practical, and engaging – now I'm enrolled in the full certification program!",
    name: "Nathan Marshall",
    role: "Admin Assistant",
  },
  {
    quote:
      "This course took me from 'doing the job' to truly leading it. Mastering budgeting, vendor contracts, and risk management got me the opportunity to be promoted.",
    name: "Ema Romero",
    role: "Architect",
  },
  {
    quote:
      "Perfect mid-career boost. Learned CAFM systems, emergency preparedness, and how to present to the C-suite. A great asset for future success.",
    name: "Wanjiku Cole",
    role: "Manager",
  },
];

export const contactContent = {
  title: "Ready to Work Together? Build a FM team with us!",
  eyebrow: "Request a Training",
  fields: ["Enter your name", "Enter your email address", "Subject", "Message"],
  cta: "Send Message",
};

export const faqIntro = {
  eyebrow: "Learn More From",
  title: "Frequently Asked Questions",
};

export const faqs = [
  {
    question: "Why Choose CAISBE?",
    answer: [
      "Internationally benchmarked FM certifications",
      "Industry-recognized qualifications",
      "Corporate training for high-performing organizations",
      "Global industry partnerships and accredited instructors",
      "A growing community of Sustainable Built Environment professionals, students, and employers",
    ],
  },
  {
    question: "How long does FM training take?",
    answer: [
      "Program duration varies by certificate. Introductory courses may run 8 weeks, while full certification pathways typically span several months with flexible pacing options.",
    ],
  },
  {
    question: "Can I study FM online or weekends?",
    answer: [
      "Yes. CAISBE offers online learning and weekend study options designed for working professionals across Canada, the United States, and Africa.",
    ],
  },
];

export const services = [
  "Professional certifications",
  "Corporate training & consultancy",
  "Research, standards, and industry guidelines",
  "Membership and CPD programming",
  "Events, conferences, and knowledge sharing",
  "Advocacy and Policy dialogue",
];

const rawFooterColumns = [
  {
    title: "Our Services",
    links: services,
  },
  {
    title: "Programs",
    links: certificates.map((c) => c.code),
  },
  {
    title: "Organization",
    links: [
      "About Us",
      "Our Mission",
      "Offices",
      "Projects",
      "Contact Us",
      "Membership",
    ],
  },
  {
    title: "Resources",
    links: [
      "Certifications",
      "Corporate Training",
      "Research",
      "Standards",
      "FAQ",
    ],
  },
];

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  href: string;
  links: FooterLink[];
};

const footerLinkOverrides: Record<string, string> = {
  Membership: "/membership",
  "About Us": "/about",
  "Contact Us": "/contact",
  FAQ: "/#faq",
  Certifications: "/professional-development",
  Research: "/resources/research-benchmarking",
  FMC: "/professional-development/fmc",
  PMC: "/professional-development/pmc",
  CHMC: "/professional-development/chmc",
  HSC: "/professional-development/hsc",
  CEEBM: "/professional-development/ceebm",
  RIPVC: "/professional-development/ripvc",
  SRET: "/professional-development/sret",
};

export const footerColumns: FooterColumn[] = rawFooterColumns.map((column) => ({
  title: column.title,
  href: buildPath(column.title),
  links: column.links.map((link) => ({
    label: link,
    href: footerLinkOverrides[link] ?? linkPath(link, column.title),
  })),
}));
