import type { NavSectionData } from "@/components/layout/nav-types";
import type { FooterColumn } from "@/lib/data/home";
import type { SimpleLink } from "@/lib/data/navigation";

export type Locale = "en" | "fr";

export const LOCALE_COOKIE = "caisbe_lang";

export function normalizeLocale(raw: string | null | undefined): Locale {
  const value = (raw ?? "en").trim().toLowerCase();
  if (value === "fr" || value.startsWith("fr-") || value.startsWith("fr_")) {
    return "fr";
  }
  return "en";
}

/** Pick the English or French value for a locale. */
export function pick<V>(locale: Locale, en: V, fr: V): V {
  return locale === "fr" ? fr : en;
}

const NAV_LABEL_FR: Record<string, string> = {
  // Utility links
  About: "À propos",
  "Store / Bookstore": "Boutique / Librairie",
  "News & Announcements": "Actualités et annonces",
  "Help and Support": "Aide et assistance",
  Contact: "Contact",
  // Top-level & group titles
  Membership: "Adhésion",
  "Membership Overview and Benefits": "Aperçu et avantages de l'adhésion",
  "Join / Register / Renew": "Adhérer / S'inscrire / Renouveler",
  "Manage Account (login)": "Gérer mon compte (connexion)",
  "Types of Membership": "Types d'adhésion",
  Network: "Réseau",
  Overview: "Aperçu",
  "Discussion Forum": "Forum de discussion",
  Events: "Événements",
  "Event Calendar": "Calendrier des événements",
  "Africa–Canada Built Environment Expo & Forum":
    "Expo et Forum Canada–Afrique sur l'environnement bâti",
  "Conferences and Webinars": "Conférences et webinaires",
  "Get Involved": "S'impliquer",
  "Sponsor and Advertise": "Commanditer et annoncer",
  "Awards and Excellence": "Prix et excellence",
  "Professional Development": "Perfectionnement professionnel",
  "Certificate Programs": "Programmes de certificat",
  "Learning Formats": "Formats d'apprentissage",
  "Online (Self-Paced)": "En ligne (à votre rythme)",
  "Virtual Classes": "Classes virtuelles",
  "In-Person Classroom Training": "Formation en présentiel",
  "On-Site Corporate Training": "Formation en entreprise sur site",
  Partners: "Partenaires",
  Partnerships: "Partenariats",
  "Become a Partner": "Devenir partenaire",
  "Become a Sponsor": "Devenir commanditaire",
  Resources: "Ressources",
  "Careers & Job Board": "Carrières et offres d'emploi",
  "Advocacy and Government": "Plaidoyer et affaires gouvernementales",
  "CAISBE Help Desk": "Centre d'assistance CAISBE",
  Tickets: "Billets de support",
  "Forms and Guides": "Formulaires et guides",
  Media: "Médias",
  "CAISBE Magazine": "Magazine CAISBE",
  YouTube: "YouTube",
  Podcast: "Balado",
  Blog: "Blogue",
  "About CAISBE": "À propos du CAISBE",
  "About the Association": "À propos de l'association",
  "About Us": "Qui sommes-nous",
  "What is the Built Environment?": "Qu'est-ce que l'environnement bâti ?",
  "Our Leadership": "Notre direction",
  Staff: "Équipe",
  Volunteering: "Bénévolat",
  // Footer headings & links
  "Our Services": "Nos services",
  Programs: "Programmes",
  "Our Mission": "Notre mission",
  Offices: "Bureaux",
  Projects: "Projets",
  // Page chrome (eyebrows and back links)
  "About Overview": "Aperçu — À propos",
  "All Resources": "Toutes les ressources",
  "Membership Overview": "Aperçu de l'adhésion",
  "Events Overview": "Aperçu des événements",
  "Network Overview": "Aperçu du réseau",
  "Programs Overview": "Aperçu des programmes",
  Home: "Accueil",
  Legal: "Mentions légales",
  Store: "Boutique",
  CAISBE: "CAISBE",
  "Go back": "Retour",
};

export function translateLabel(label: string, locale: Locale): string {
  if (locale !== "fr") return label;
  return NAV_LABEL_FR[label] ?? label;
}

export function localizeNavSections(
  sections: NavSectionData[],
  locale: Locale,
): NavSectionData[] {
  if (locale !== "fr") return sections;
  return sections.map((section) => ({
    ...section,
    label: translateLabel(section.label, locale),
    groups: section.groups.map((group) => ({
      ...group,
      title: translateLabel(group.title, locale),
      links: group.links.map((link) => ({
        ...link,
        label: translateLabel(link.label, locale),
      })),
    })),
  }));
}

export function localizeUtilityLinks(
  links: SimpleLink[],
  locale: Locale,
): SimpleLink[] {
  if (locale !== "fr") return links;
  return links.map((link) => ({
    ...link,
    label: translateLabel(link.label, locale),
  }));
}

export function localizeFooterColumns(
  columns: FooterColumn[],
  locale: Locale,
): FooterColumn[] {
  if (locale !== "fr") return columns;
  return columns.map((column) => ({
    ...column,
    title: translateLabel(column.title, locale),
    links: column.links.map((link) => ({
      ...link,
      label: translateLabel(link.label, locale),
    })),
  }));
}

export type Dictionary = {
  siteFullName: string;
  auth: {
    login: string;
    register: string;
    logout: string;
  };
  mobileNav: {
    openMenu: string;
    closeMenu: string;
    quickLinks: string;
    expand: string;
    collapse: string;
    language: string;
  };
  hero: {
    slidesAria: string;
    showSlide: (index: number) => string;
  };
  certificates: {
    empty: string;
  };
  magazine: {
    empty: string;
    readIssue: string;
    badge: string;
  };
  offices: {
    direction: string;
    mapTitle: (region: string) => string;
  };
  contact: {
    detailsHeading: string;
    addressLabel: string;
    phoneLabel: string;
    emailLabel: string;
    hoursLabel: string;
    officesHeading: string;
    openInGoogleMaps: string;
    form: {
      firstName: string;
      lastName: string;
      company: string;
      jobTitle: string;
      phone: string;
      email: string;
      helpTopic: string;
      comments: string;
      sending: string;
      success: string;
      error: string;
    };
  };
  footer: {
    contactHeading: string;
    getInTouch: string;
    subscribeHeading: string;
    subscribeSubtext: string;
    privacyPolicy: string;
    corporateLine: string;
    copyright: (fullName: string) => string;
    newsletter: {
      emailLabel: string;
      emailTitle: string;
      placeholder: string;
      subscribe: string;
      subscribing: string;
      invalidEmail: string;
      errorFallback: string;
    };
  };
  carousel: {
    previous: string;
    next: string;
  };
};

const EN_DICT: Dictionary = {
  siteFullName: "Canada Africa Institute for the Sustainable Built Environment",
  auth: {
    login: "Login",
    register: "Register",
    logout: "Log out",
  },
  mobileNav: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    quickLinks: "Quick links",
    expand: "Expand",
    collapse: "Collapse",
    language: "Language",
  },
  hero: {
    slidesAria: "Hero slides",
    showSlide: (index) => `Show slide ${index}`,
  },
  certificates: {
    empty: "Certificate programs will appear here once published by CAISBE.",
  },
  carousel: {
    previous: "Previous",
    next: "Next",
  },
  magazine: {
    empty: "New magazine issues will appear here once published by the CAISBE team.",
    readIssue: "Read issue",
    badge: "Magazine",
  },
  offices: {
    direction: "Direction",
    mapTitle: (region) => `${region} office map`,
  },
  contact: {
    detailsHeading: "Contact Us",
    addressLabel: "Our Address",
    phoneLabel: "Phone",
    emailLabel: "Email",
    hoursLabel: "Business Hours",
    officesHeading: "Offices",
    openInGoogleMaps: "Open in Google Maps",
    form: {
      firstName: "First Name",
      lastName: "Last Name",
      company: "Company",
      jobTitle: "Job Title",
      phone: "Phone",
      email: "Email",
      helpTopic: "How can we help?",
      comments: "Comments",
      sending: "Sending…",
      success: "Thank you. Your message has been sent.",
      error: "Unable to send your message. Please try again.",
    },
  },
  footer: {
    contactHeading: "Contact",
    getInTouch: "Get in touch",
    subscribeHeading: "Subscribe to newsletter",
    subscribeSubtext: "Get magazine issues and CAISBE news by email.",
    privacyPolicy: "Privacy Policy",
    corporateLine:
      "CAISBE – Corporate No: 1750704-6 - CAISBE, Canada-Africa Institute for the Sustainable Built Environment (CAISBE) 815 4 Ave S, Calgary, AB, T2P 3G8 Canada",
    copyright: (fullName) => `Copyright © 2026 ${fullName}`,
    newsletter: {
      emailLabel: "Email",
      emailTitle: "Enter a valid email address",
      placeholder: "name@example.com",
      subscribe: "Subscribe",
      subscribing: "Subscribing…",
      invalidEmail: "Enter a valid email address.",
      errorFallback: "Unable to subscribe.",
    },
  },
};

const FR_DICT: Dictionary = {
  siteFullName:
    "Institut Canada-Afrique pour l'environnement bâti durable",
  auth: {
    login: "Connexion",
    register: "S'inscrire",
    logout: "Déconnexion",
  },
  mobileNav: {
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    quickLinks: "Liens rapides",
    expand: "Développer",
    collapse: "Réduire",
    language: "Langue",
  },
  hero: {
    slidesAria: "Diapositives de présentation",
    showSlide: (index) => `Afficher la diapositive ${index}`,
  },
  certificates: {
    empty:
      "Les programmes de certificat apparaîtront ici dès leur publication par le CAISBE.",
  },
  carousel: {
    previous: "Précédent",
    next: "Suivant",
  },
  magazine: {
    empty:
      "Les nouveaux numéros du magazine apparaîtront ici dès leur publication par l'équipe du CAISBE.",
    readIssue: "Lire le numéro",
    badge: "Magazine",
  },
  offices: {
    direction: "Itinéraire",
    mapTitle: (region) => `Carte du bureau – ${region}`,
  },
  contact: {
    detailsHeading: "Nous contacter",
    addressLabel: "Notre adresse",
    phoneLabel: "Téléphone",
    emailLabel: "Courriel",
    hoursLabel: "Heures d'ouverture",
    officesHeading: "Bureaux",
    openInGoogleMaps: "Ouvrir dans Google Maps",
    form: {
      firstName: "Prénom",
      lastName: "Nom de famille",
      company: "Entreprise / Organisation",
      jobTitle: "Poste / Fonction",
      phone: "Téléphone",
      email: "Courriel",
      helpTopic: "Comment pouvons-nous vous aider ?",
      comments: "Commentaires",
      sending: "Envoi en cours…",
      success: "Merci. Votre message a bien été envoyé.",
      error: "Impossible d'envoyer votre message. Veuillez réessayer.",
    },
  },
  footer: {
    contactHeading: "Contact",
    getInTouch: "Nous écrire",
    subscribeHeading: "S'abonner à l'infolettre",
    subscribeSubtext:
      "Recevez les numéros du magazine et les actualités du CAISBE par courriel.",
    privacyPolicy: "Politique de confidentialité",
    corporateLine:
      "CAISBE – N° d'entreprise : 1750704-6 - CAISBE, Institut Canada-Afrique pour l'environnement bâti durable (CAISBE) 815 4 Ave S, Calgary (Alberta) T2P 3G8 Canada",
    copyright: (fullName) => `Droits d'auteur © 2026 ${fullName}`,
    newsletter: {
      emailLabel: "Courriel",
      emailTitle: "Veuillez saisir une adresse courriel valide",
      placeholder: "nom@exemple.com",
      subscribe: "S'abonner",
      subscribing: "Abonnement…",
      invalidEmail: "Veuillez saisir une adresse courriel valide.",
      errorFallback: "Impossible de procéder à l'abonnement.",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return locale === "fr" ? FR_DICT : EN_DICT;
}

export const FALLBACK_HOME_FR = {
  tagline: "Transformer les bâtiments. Autonomiser les communautés.",
  hero_intro:
    "Le CAISBE prépare la prochaine génération de professionnels de la gestion des installations et de l'immobilier à mener une transformation durable des bâtiments et des infrastructures en Afrique — en s'appuyant sur l'expertise canadienne, les normes mondiales et l'innovation verte. Rejoignez-nous pour une formation de calibre mondial, des normes sectorielles et une adhésion professionnelle.",
  hero_button: "Rejoindre le CAISBE",
  stats: [
    { value: "12+", label: "Cours certifiés" },
    { value: "25+", label: "Années d'expérience cumulées sur le terrain" },
    {
      value: "12+",
      label: "Associations professionnelles et sectorielles basées en Afrique",
    },
    {
      value: "1520+",
      label: "Membres et une communauté qui grandit chaque jour",
    },
  ],
  about_eyebrow: "Des années de réussite continue",
  about_body:
    "L'Institut Canada-Afrique pour l'environnement bâti durable (CAISBE) a été créé pour combler les écarts de connaissances, de technologies et de capacités entre le Canada et l'Afrique dans les domaines de la construction durable, des infrastructures résilientes, du développement immobilier et de la gérance environnementale. Alors que les villes africaines connaissent une croissance rapide et que le Canada progresse dans les technologies vertes et la conception résiliente au climat, le CAISBE offre une plateforme collaborative où convergent les meilleures pratiques, la recherche et la formation professionnelle.",
  about_cta: "Travailler avec nous",
  about_highlights: [
    {
      title: "Durabilité",
      description:
        "Promouvoir une exploitation écoresponsable des installations grâce à l'efficacité énergétique, aux énergies renouvelables, à la conservation de l'eau, à la réduction des déchets, aux pratiques de bâtiment durable et aux stratégies carboneutres.",
    },
    {
      title: "Technologie moderne",
      description:
        "Faire progresser l'utilisation de la technologie pour améliorer la performance des bâtiments grâce aux systèmes intelligents, aux capteurs IoT, à la GMAO, à l'automatisation du bâtiment, à l'analyse de données et aux solutions numériques de gestion des installations.",
    },
    {
      title: "Innovation locale et savoirs autochtones",
      description:
        "Allier les meilleures pratiques mondiales à l'expertise africaine locale, aux savoirs traditionnels et aux solutions innovantes afin de concevoir des approches de gestion des installations pratiques, abordables et adaptées aux réalités locales.",
    },
  ],
  certificates_title: "Formez votre équipe en gestion des installations",
  certificates_subtitle: "Programmes de certification éducative de qualité",
  certificates_cta: "Voir tout",
  magazine_title: "Magazine CAISBE",
  magazine_subtitle:
    "Découvrez les derniers dossiers et analyses de la communauté CAISBE.",
  magazine_cta: "Voir tous les numéros",
  practice_eyebrow: "Pratique",
  practice_title: "Nous suivons les meilleures pratiques",
  practice_body:
    "Nous appliquons les meilleures pratiques et les déployons à l'échelle de l'Afrique",
  practice_items: [
    {
      title: "Durabilité",
      description:
        "Promouvoir une exploitation écoresponsable des installations grâce à l'efficacité énergétique, aux énergies renouvelables, à la conservation de l'eau, à la réduction des déchets, aux pratiques de bâtiment durable et aux stratégies carboneutres. L'expertise canadienne en durabilité accompagne les organisations africaines dans le développement d'installations résilientes, sobres en carbone et rentables.",
    },
    {
      title: "Technologie moderne",
      description:
        "Faire progresser l'utilisation de la technologie pour améliorer la performance des bâtiments grâce aux systèmes intelligents, aux capteurs IoT, à la GMAO, à l'automatisation du bâtiment, à l'analyse de données et aux solutions numériques de gestion des installations.",
    },
    {
      title: "Innovation locale et savoirs autochtones",
      description:
        "Allier les meilleures pratiques mondiales à l'expertise africaine locale, aux savoirs traditionnels et aux solutions innovantes afin de concevoir des approches de gestion des installations pratiques, abordables et adaptées aux réalités locales.",
    },
    {
      title: "Perfectionnement professionnel et renforcement des capacités",
      description:
        "Développer une main-d'œuvre qualifiée en gestion des installations par la formation, la certification, le mentorat et des programmes de partage des connaissances reliant l'expérience canadienne aux besoins du secteur en Afrique.",
    },
    {
      title: "Gestion du cycle de vie des actifs",
      description:
        "Promouvoir la maintenance proactive, la planification des actifs et des stratégies sur l'ensemble du cycle de vie qui améliorent la performance des bâtiments, réduisent les coûts d'exploitation et maximisent la valeur à long terme des investissements en infrastructures.",
    },
  ],
  offices_title: "Bureaux",
  offices: [
    {
      region: "Canada",
      address: "815-4AVE SW, CALGARY Alberta,\nT2P 5N7",
      map_query: "815 4 Ave SW, Calgary, AB T2P 5N7, Canada",
    },
    {
      region: "États-Unis",
      address: "191 Peachtree Street NE,\nAtlanta, GA 30303, USA",
      map_query: "191 Peachtree Street NE, Atlanta, GA 30303, USA",
    },
    {
      region: "Afrique",
      address: "Union africaine, Mexico Road,\nRosvelt Street, Addis-Abeba",
      map_query: "African Union, Mexico Road, Rosvelt Street, Addis Ababa, Ethiopia",
    },
  ],
  testimonials_eyebrow: "Témoignages",
  testimonials_title: "Ce que disent les participants à nos cours",
  contact_eyebrow: "Nous contacter",
  contact_title: "Nous contacter",
  contact_lead:
    "Merci de votre intérêt pour les formations du CAISBE. Dites-nous comment nous pouvons vous aider !",
  contact_address: "815-4Ave SW, Calgary, AB\nTWP 3G8",
  contact_phone: "1825-454-5383 / 4039039047 / 4048349904",
  contact_email: "info@caisbe.org",
  contact_hours: "En semaine : 9 h à 17 h HE",
  contact_form_heading: "Comment pouvons-nous vous aider ?",
  contact_cta: "Envoyer le message",
};
