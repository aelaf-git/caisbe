/**
 * French copies of the seeded Admin Pages. Used only when the API is unreachable
 * (normally French text comes from the database, written in the Admin FR tab).
 * Generated from api/app/seeds/site_pages_fr.py.
 */
import type { TopicPage } from "@/lib/data/site-pages";

export const FR_SITE_PAGES: Record<string, TopicPage> = {
  "/about": {
    "slug": "about",
    "title": "À propos de l’Institut canado-africain pour l’environnement bâti durable (CAISBE)",
    "description": "Découvrez la mission, la direction, l’accréditation et l’engagement du CAISBE pour élever les normes professionnelles en gestion des installations.",
    "lead": "L’Institut canado-africain pour l’environnement bâti durable (CAISBE) est un pôle international de connaissances, de formation et d’innovation voué à l’avancement de la construction durable, des infrastructures résilientes et d’un développement immobilier respectueux de l’environnement à travers l’Afrique.",
    "sections": [
      {
        "title": "Notre mission",
        "body": "Renforcer l’environnement bâti par l’éducation, l’innovation et la collaboration, afin de permettre aux professionnels, aux institutions et aux décideurs de concevoir, de construire et de gérer des bâtiments et des infrastructures durables, résilients et efficaces.",
        "items": []
      },
      {
        "title": "Notre vision",
        "body": "Un monde où chaque collectivité a accès à des bâtiments durables, à des infrastructures résilientes face au climat et à des systèmes urbains inclusifs qui soutiennent le bien-être des générations actuelles et futures.",
        "items": []
      },
      {
        "title": "Ce que nous faisons",
        "body": "",
        "items": [
          "Certifications professionnelles",
          "Formation en entreprise et services-conseils",
          "Recherche, normes et lignes directrices de l’industrie",
          "Adhésion et programmation de développement professionnel continu (DPC)",
          "Événements, conférences et partage des connaissances",
          "Plaidoyer et dialogue sur les politiques"
        ]
      }
    ],
    "ctaLabel": "Nous joindre",
    "ctaHref": "/contact"
  },
  "/about/board-of-directors": {
    "slug": "board-of-directors",
    "title": "Conseil d’administration",
    "description": "Rencontrez les dirigeants qui orientent la stratégie, la gouvernance et les normes professionnelles du CAISBE.",
    "lead": "Le conseil guide la stratégie, l’intendance et les normes professionnelles du CAISBE dans le cadre de la collaboration Afrique–Canada.",
    "sections": [
      {
        "title": "Priorités du conseil",
        "body": "",
        "items": [
          "Orientation stratégique et intégrité institutionnelle",
          "Surveillance des programmes, des partenariats et des finances",
          "Promotion de l’excellence professionnelle dans l’environnement bâti"
        ]
      },
      {
        "title": "Domaines de leadership",
        "body": "",
        "items": [
          "Présidence et dirigeants",
          "Gestion des programmes et de l’adhésion",
          "Rôles de liaison régionale et de partenariat"
        ]
      },
      {
        "title": "Communiquer avec la direction",
        "body": "Pour toute correspondance au conseil, mise en candidature ou question de gouvernance, communiquez avec le bureau de l’Institut.",
        "items": []
      }
    ],
    "ctaLabel": "Joindre le bureau du conseil d'administration",
    "ctaHref": "/contact"
  },
  "/about/brand-assets": {
    "slug": "brand-assets",
    "title": "Ressources de marque",
    "description": "Accédez aux lignes directrices et aux ressources de la marque CAISBE destinées aux partenaires et aux médias approuvés.",
    "lead": "Les partenaires et les médias approuvés peuvent demander les ressources de la marque CAISBE et les directives d’utilisation.",
    "sections": [
      {
        "title": "Disponible sur demande",
        "body": "",
        "items": [
          "Fichiers du logo principal pour le numérique et l’impression",
          "Directives sur les couleurs et la typographie",
          "Notes de comarquage pour les événements et les partenariats"
        ]
      },
      {
        "title": "Règles d’utilisation",
        "body": "",
        "items": [
          "Ne modifiez pas les proportions ni les couleurs du logo sans autorisation",
          "Conservez un espace libre autour de la marque",
          "Utilisez les ressources uniquement pour des communications approuvées liées au CAISBE"
        ]
      },
      {
        "title": "Demander les ressources",
        "body": "Écrivez à l’équipe des communications en indiquant le nom de votre organisation, l’usage prévu et l’échéance.",
        "items": []
      }
    ],
    "ctaLabel": "Demander les ressources de marque",
    "ctaHref": "/contact"
  },
  "/about/governance": {
    "slug": "governance",
    "title": "Gouvernance",
    "description": "Découvrez comment le CAISBE est gouverné pour servir ses membres et faire progresser la profession.",
    "lead": "Le CAISBE est gouverné de manière à servir ses membres, à protéger la confiance institutionnelle et à faire progresser la profession de façon responsable.",
    "sections": [
      {
        "title": "Principes de gouvernance",
        "body": "",
        "items": [
          "Transparence et responsabilité envers les membres",
          "Rôles clairs pour le conseil, le personnel et les bénévoles",
          "Gestion éthique des programmes et des partenariats",
          "Cohérence avec la mission et l’impact à long terme"
        ]
      },
      {
        "title": "Politiques et questions",
        "body": "Consultez les politiques connexes, comme notre politique de confidentialité, et communiquez avec nous pour toute demande de documents de gouvernance.",
        "items": []
      }
    ],
    "ctaLabel": "Politique de confidentialité",
    "ctaHref": "/privacy-policy"
  },
  "/about/staff": {
    "slug": "staff",
    "title": "Personnel",
    "description": "Faites connaissance avec l’équipe du CAISBE qui soutient les membres, les programmes et les partenariats.",
    "lead": "Le personnel du CAISBE soutient les membres, les programmes, les événements et les activités quotidiennes de l’Institut.",
    "sections": [
      {
        "title": "Comment l’équipe vous soutient",
        "body": "",
        "items": [
          "Accueil des membres et renouvellements",
          "Coordination du développement professionnel",
          "Événements, communications et relations avec les partenaires",
          "Soutien de bureau au Canada et en Afrique"
        ]
      },
      {
        "title": "Joindre l’équipe",
        "body": "Utilisez la page Contact pour les demandes générales, ou écrivez au bureau de votre région.",
        "items": []
      }
    ],
    "ctaLabel": "Joindre le personnel",
    "ctaHref": "/contact"
  },
  "/about/volunteering": {
    "slug": "volunteering",
    "title": "Bénévolat",
    "description": "Découvrez comment faire du bénévolat et contribuer aux programmes et aux initiatives communautaires du CAISBE.",
    "lead": "Les bénévoles aident à organiser les événements, à encadrer leurs pairs, à soutenir les sections et à faire grandir la communauté professionnelle.",
    "sections": [
      {
        "title": "Façons de contribuer",
        "body": "",
        "items": [
          "Soutien aux événements et aux forums",
          "Leadership de section et mobilisation des membres",
          "Mentorat et partage des connaissances",
          "Comités des programmes, des prix et de la sensibilisation"
        ]
      },
      {
        "title": "Pour commencer",
        "body": "Dites-nous vos intérêts et vos disponibilités : nous vous proposerons des occasions adaptées à vos compétences. Écrivez à info@caisbe.org pour commencer.",
        "items": []
      }
    ],
    "ctaLabel": "Commencer",
    "ctaHref": "mailto:info@caisbe.org?subject=Volunteer%20inquiry"
  },
  "/about/what-is-built-environment": {
    "slug": "what-is-built-environment",
    "title": "Qu’est-ce que l’environnement bâti?",
    "description": "Découvrez ce que signifie l’environnement bâti et pourquoi la gestion des installations est essentielle au développement durable en Afrique.",
    "lead": "L’environnement bâti désigne les espaces et les systèmes créés par l’humain où les gens vivent, travaillent et interagissent, y compris les bâtiments, les infrastructures et les services nécessaires pour les exploiter et les entretenir.",
    "sections": [
      {
        "title": "Le point de vue de la gestion des installations",
        "body": "Du point de vue de la gestion des installations, l’environnement bâti consiste à gérer les actifs de façon sûre, efficace et durable, tout au long de leur cycle de vie.",
        "items": []
      },
      {
        "title": "Pourquoi c’est important en Afrique",
        "body": "En Afrique, une gestion des installations efficace est essentielle pour soutenir l’urbanisation rapide, la croissance des infrastructures et le développement durable. En appliquant les meilleures pratiques mondiales, l’innovation et l’expertise locale, la gestion des installations contribue à améliorer la performance des bâtiments, la valeur des actifs, l’efficacité énergétique, la résilience et la qualité de vie des collectivités.",
        "items": []
      },
      {
        "title": "Collaboration Afrique–Canada",
        "body": "Grâce à la collaboration Afrique–Canada, le partage d’expertise, l’innovation et le renforcement des capacités peuvent soutenir la création d’environnements bâtis plus intelligents, plus verts et plus résilients, porteurs d’avantages sociaux, économiques et environnementaux durables.",
        "items": []
      }
    ],
    "ctaLabel": "À propos du CAISBE",
    "ctaHref": "/about"
  },
  "/careers": {
    "slug": "careers",
    "title": "Carrières et offres d’emploi",
    "description": "Explorez les emplois en gestion des installations, les stages et les ressources de développement de carrière publiés par le CAISBE.",
    "lead": "Parcourez les postes en gestion des installations publiés par le CAISBE pour les professionnels du Canada, de l’Afrique et des marchés mondiaux.",
    "sections": [],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/events": {
    "slug": "events",
    "title": "Événements",
    "description": "Forums, conférences, webinaires, commandites et programmes de prix du CAISBE.",
    "lead": "Réseautez grâce à des forums phares, à des événements d’apprentissage et à des programmes de reconnaissance en Afrique et au Canada.",
    "sections": [
      {
        "title": "Explorer les événements",
        "body": "",
        "items": [
          "Calendrier des événements",
          "Exposition et forum Afrique–Canada sur l’environnement bâti",
          "Conférences et webinaires",
          "Participer",
          "Commandites et publicité",
          "Prix et excellence"
        ]
      }
    ],
    "ctaLabel": "Voir le calendrier",
    "ctaHref": "/events/calendar"
  },
  "/events/awards": {
    "slug": "awards",
    "title": "Prix et excellence",
    "description": "Reconnaître des personnes, des organisations et des projets exceptionnels en gestion des installations et des propriétés.",
    "lead": "Le programme Prix et excellence souligne les personnes, les organisations et les projets exceptionnels qui font preuve d’innovation, de leadership, de durabilité et d’excellence en gestion des installations et des propriétés.",
    "sections": [
      {
        "title": "Catégories de prix",
        "body": "",
        "items": [
          "Gestionnaire d’installations de l’année",
          "Gestionnaire immobilier de l’année",
          "Excellence d’entreprise en gestion des installations",
          "Prix de leadership en durabilité et en bâtiment écologique",
          "Prix en santé, sécurité et gestion des risques",
          "Projet de gestion des installations exceptionnel de l’année"
        ]
      },
      {
        "title": "Mises en candidature",
        "body": "Vous souhaitez proposer une personne, une organisation ou un projet? Communiquez avec nous pour en savoir plus sur les catégories de prix, les critères d’admissibilité, les procédures de mise en candidature et les possibilités de commandite.",
        "items": []
      }
    ],
    "ctaLabel": "Nous joindre",
    "ctaHref": "/contact"
  },
  "/events/calendar": {
    "slug": "calendar",
    "title": "Calendrier des événements",
    "description": "Explorez les prochains événements, forums, conférences et webinaires du CAISBE qui relient l’Afrique et le Canada dans le secteur de l’environnement bâti.",
    "lead": "Une vue vivante des forums, des conférences, des webinaires et des activités des sections au calendrier du CAISBE.",
    "sections": [],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/events/conferences": {
    "slug": "conferences",
    "title": "Conférences et webinaires",
    "description": "Restez connecté grâce à des conférences et à des webinaires sur la gestion des installations, la durabilité et la collaboration Afrique–Canada dans l’environnement bâti.",
    "lead": "Des conférences et des webinaires qui tiennent les praticiens à jour sur la pratique en gestion des installations, la durabilité et la collaboration.",
    "sections": [
      {
        "title": "Thèmes des séances",
        "body": "",
        "items": [
          "Séances techniques sur les opérations, les actifs et le milieu de travail",
          "Dialogues sur les politiques et la durabilité",
          "Études de cas d’organisations africaines et canadiennes",
          "Réseautage avec des pairs, des éducateurs et des partenaires"
        ]
      },
      {
        "title": "Participer",
        "body": "Proposez un sujet de séance ou demandez à être avisé de l’ouverture des inscriptions à la prochaine série de conférences.",
        "items": []
      }
    ],
    "ctaLabel": "Proposer ou manifester son intérêt",
    "ctaHref": "/contact"
  },
  "/events/expo": {
    "slug": "expo",
    "title": "Exposition et forum Afrique–Canada sur l’environnement bâti",
    "description": "Une plateforme internationale de premier plan pour la collaboration, l’innovation et le développement durable dans le secteur de l’environnement bâti.",
    "lead": "L’exposition et forum réunit des leaders de l’industrie, des décideurs, des investisseurs, des universitaires et des professionnels pour favoriser la collaboration et le développement durable.",
    "sections": [
      {
        "title": "Objectifs",
        "body": "",
        "items": [
          "Promouvoir l’échange de connaissances et de bonnes pratiques entre l’Afrique et le Canada",
          "Présenter des technologies, des produits et des solutions durables innovants",
          "Faciliter l’investissement, le commerce et les partenariats stratégiques",
          "Renforcer les réseaux professionnels et le développement des capacités",
          "Faire progresser des infrastructures résilientes, intelligentes et durables en Afrique"
        ]
      },
      {
        "title": "Participants",
        "body": "Organismes gouvernementaux, gestionnaires d’installations et de propriétés, ingénieurs, architectes, urbanistes, entreprises de construction, promoteurs immobiliers, fournisseurs de technologies, établissements d’enseignement, investisseurs, partenaires de développement, ONG et associations de l’industrie d’Afrique et du Canada.",
        "items": []
      }
    ],
    "ctaLabel": "Se joindre et participer",
    "ctaHref": "/events/calendar"
  },
  "/events/get-involved": {
    "slug": "get-involved",
    "title": "Participer",
    "description": "Participez aux événements du CAISBE comme conférencier, bénévole, partenaire ou participant. Joignez notre communauté et contribuez aux conversations qui font avancer l’environnement bâti durable.",
    "lead": "Il existe de nombreuses façons de contribuer : prendre la parole, faire du bénévolat, s’associer ou participer.",
    "sections": [
      {
        "title": "Façons de contribuer",
        "body": "",
        "items": [
          "Prendre la parole lors d’un forum, d’un webinaire ou d’un programme de section",
          "Faire du bénévolat lors des événements et soutenir l’expérience des participants",
          "Vous associer à la programmation ou à la sensibilisation",
          "Participer et élargir votre réseau professionnel"
        ]
      },
      {
        "title": "Dites-nous vos intérêts",
        "body": "Faites-nous part de vos intérêts et nous vous aiderons à trouver la bonne occasion.",
        "items": []
      }
    ],
    "ctaLabel": "Participer",
    "ctaHref": "/contact"
  },
  "/events/sponsor": {
    "slug": "sponsor",
    "title": "Commandites et publicité",
    "description": "Faites connaître votre organisation à un public international de professionnels de la gestion des installations et de l’environnement bâti. Explorez les possibilités de commandite, de publicité et d’exposition aux événements du CAISBE.",
    "lead": "Joignez les professionnels de la gestion des installations et de l’environnement bâti grâce aux commandites, à la publicité et à l’exposition.",
    "sections": [
      {
        "title": "Possibilités",
        "body": "",
        "items": [
          "Visibilité de la marque lors des forums phares et sur les canaux numériques",
          "Possibilités d’exposition et de présentation",
          "Occasions de prise de parole en leadership éclairé",
          "Harmonisation avec les thèmes de la durabilité et du développement professionnel"
        ]
      },
      {
        "title": "Forfaits",
        "body": "Faites-nous part de vos objectifs et de votre public : nous vous présenterons des forfaits adaptés à votre organisation.",
        "items": []
      }
    ],
    "ctaLabel": "Commandites et publicité",
    "ctaHref": "/contact"
  },
  "/help": {
    "slug": "help",
    "title": "Aide et soutien",
    "description": "FAQ, billets de soutien technique et demandes concernant les cours, les certificats, votre compte et les problèmes à signaler.",
    "lead": "FAQ, billets techniques et demandes concernant les cours, les certificats, votre compte et les problèmes à signaler.",
    "sections": [],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/membership": {
    "slug": "membership",
    "title": "Adhésion",
    "description": "Aperçu de l’adhésion, options d’inscription et de renouvellement, et catégories de membres.",
    "lead": "Faites progresser votre carrière et votre organisation grâce aux avantages, à l’apprentissage et à la communauté de l’adhésion au CAISBE.",
    "sections": [
      {
        "title": "Explorer l’adhésion",
        "body": "",
        "items": [
          "Aperçu et avantages de l’adhésion",
          "S’inscrire / Renouveler",
          "Types d’adhésion"
        ]
      }
    ],
    "ctaLabel": "Devenir membre",
    "ctaHref": "/membership/become-a-member"
  },
  "/membership/become-a-member": {
    "slug": "become-a-member",
    "title": "Devenir membre",
    "description": "Joignez le CAISBE ou renouvelez votre adhésion pour accéder à la formation, au réseautage et aux ressources professionnelles.",
    "lead": "Commencez ou renouvelez votre adhésion pour accéder à l’apprentissage, au réseautage et aux ressources réservées aux membres du CAISBE.",
    "sections": [
      {
        "title": "Comment procéder",
        "body": "Utilisez « Adhérer maintenant » pour vous inscrire, ou « Renouveler l’adhésion » si vous êtes déjà membre du CAISBE.",
        "items": []
      }
    ],
    "ctaLabel": "Adhérer maintenant",
    "ctaHref": "/membership/forms/application"
  },
  "/membership/join": {
    "slug": "join",
    "title": "Joindre le CAISBE",
    "description": "Faites partie d’une communauté grandissante de professionnels de la gestion des installations, d’étudiants et d’organisations, ou renouvelez votre adhésion existante.",
    "lead": "Que vous débutiez votre carrière, élargissiez votre réseau professionnel, renouveliez votre adhésion ou représentiez une organisation, l’adhésion donne accès à la formation, aux analyses de l’industrie et au réseautage.",
    "sections": [
      {
        "title": "Prochaine étape",
        "body": "Inscrivez-vous ou renouvelez dès aujourd’hui et franchissez la prochaine étape de votre parcours professionnel avec le CAISBE.",
        "items": []
      }
    ],
    "ctaLabel": "Devenir membre",
    "ctaHref": "/membership/become-a-member"
  },
  "/membership/overview": {
    "slug": "overview",
    "title": "Aperçu et avantages de l’adhésion",
    "description": "La gestion des installations est une profession multidisciplinaire qui assure l’exploitation efficace, l’entretien, la sécurité et la durabilité de l’environnement bâti.",
    "lead": "La gestion des installations intègre les personnes, les lieux, les processus et la technologie pour soutenir les objectifs des organisations. Elle englobe l’exploitation des bâtiments, la gestion des actifs, la santé et la sécurité, l’aménagement des espaces et la durabilité environnementale.",
    "sections": [
      {
        "title": "La valeur de l’adhésion",
        "body": "Joignez une communauté grandissante de professionnels de la gestion des installations, d’étudiants et d’organisations.",
        "items": [
          "Formation et développement professionnel",
          "Analyses et normes de l’industrie",
          "Réseautage entre l’Afrique et le Canada"
        ]
      }
    ],
    "ctaLabel": "Joindre le CAISBE",
    "ctaHref": "/membership/join"
  },
  "/membership/types": {
    "slug": "types",
    "title": "Catégories de membres",
    "description": "Explorez les catégories de membres du CAISBE pour les étudiants, les professionnels, les organisations et les institutions.",
    "lead": "Choisissez la catégorie d’adhésion qui correspond à votre rôle et à vos objectifs.",
    "sections": [
      {
        "title": "Adhésion étudiante",
        "body": "Conçue pour les étudiants en gestion des installations, en génie, en architecture, en construction, en immobilier ou dans des domaines connexes.",
        "items": [
          "Ressources de développement de carrière",
          "Mentorat et événements éducatifs",
          "Rabais sur la formation"
        ]
      },
      {
        "title": "Adhésion professionnelle",
        "body": "Pour les personnes qui travaillent en gestion des installations et dans l’environnement bâti.",
        "items": [
          "Développement professionnel et parcours de certification",
          "Réseautage et conférences de l’industrie",
          "Ressources techniques et événements pour les membres"
        ]
      },
      {
        "title": "Adhésion corporative",
        "body": "Pour les organisations engagées envers l’excellence en gestion des installations.",
        "items": [
          "Visibilité organisationnelle",
          "Perfectionnement du personnel et formation à prix réduit",
          "Avantages de commandite et de partenariat"
        ]
      },
      {
        "title": "Membre senior / Fellow",
        "body": "Pour les professionnels de niveau direction ayant rendu des services distingués en gestion des installations.",
        "items": []
      },
      {
        "title": "Membre institutionnel",
        "body": "Pour les universités, les organismes, les instances gouvernementales et les ONG qui font progresser l’éducation et la pratique.",
        "items": []
      }
    ],
    "ctaLabel": "Adhérer maintenant",
    "ctaHref": "/membership/become-a-member"
  },
  "/network": {
    "slug": "network",
    "title": "Réseau",
    "description": "Groupes de réseautage et forum de discussion du CAISBE pour les membres et les étudiants.",
    "lead": "Bâtissez des relations professionnelles et joignez des conversations qui font progresser la pratique de la gestion des installations.",
    "sections": [
      {
        "title": "Options du réseau",
        "body": "",
        "items": [
          "Aperçu",
          "Forum de discussion"
        ]
      }
    ],
    "ctaLabel": "Aperçu",
    "ctaHref": "/network/overview"
  },
  "/network/overview": {
    "slug": "overview",
    "title": "Aperçu",
    "description": "Nos groupes de réseautage réunissent des professionnels de la gestion des installations, des étudiants, des partenaires de l’industrie et des organisations.",
    "lead": "Échangez avec des pairs, des étudiants et des partenaires grâce aux groupes de réseautage du CAISBE.",
    "sections": [
      {
        "title": "Comment fonctionne le réseautage",
        "body": "Grâce à des réunions régulières, à des webinaires, à des conférences, à des forums techniques et à des initiatives collaboratives, les membres s’informent sur les tendances émergentes, les technologies innovantes, la gestion du milieu de travail et le leadership.",
        "items": [
          "Apprentissage entre pairs en Afrique et au Canada",
          "Accès aux forums, aux webinaires et aux discussions techniques",
          "Relations qui soutiennent l’avancement de carrière et les partenariats",
          "Pratiques partagées en matière de milieu de travail, d’actifs et de durabilité"
        ]
      }
    ],
    "ctaLabel": "Joindre le forum de discussion",
    "ctaHref": "/network/discussion-forum"
  },
  "/news": {
    "slug": "news",
    "title": "Nouvelles et annonces",
    "description": "Restez informé des initiatives de l’Institut, des prochains forums, des jalons de l’adhésion et des occasions de vous impliquer.",
    "lead": "Des nouvelles des programmes, des événements, des partenariats et de la communauté professionnelle du CAISBE en Afrique et au Canada.",
    "sections": [
      {
        "title": "Dernières nouvelles",
        "body": "Les annonces sont présentées de la plus récente à la plus ancienne, telles que publiées par l’équipe du CAISBE.",
        "items": []
      }
    ],
    "ctaLabel": "Demandes des médias",
    "ctaHref": "/contact"
  },
  "/partners": {
    "slug": "partners",
    "title": "Devenir partenaire",
    "description": "Devenez partenaire du CAISBE pour l’inscription de groupe, un soutien dédié et des titres reconnus en Afrique et au Canada.",
    "lead": "Notre programme de partenariat aide les organisations à bâtir des relations, à créer des liens et à maximiser leur investissement dans la formation en gestion des installations et des propriétés.",
    "sections": [
      {
        "title": "Avantages du partenariat",
        "body": "",
        "items": [
          "Inscription de groupe qui rend la formation des équipes plus rentable",
          "Soutien dédié de l’équipe du CAISBE",
          "Reconnaissance du marché comme partenaire officiel du CAISBE",
          "Titres reconnus pour les employés, les clients ou les membres"
        ]
      },
      {
        "title": "Comment ça fonctionne",
        "body": "",
        "items": [
          "Soumettez une demande",
          "Nous vous contactons pour comprendre vos objectifs",
          "Nous préparons une proposition adaptée à vos objectifs de formation",
          "Nous lançons le partenariat en formation en gestion des propriétés et des installations"
        ]
      }
    ],
    "ctaLabel": "Devenir partenaire",
    "ctaHref": "mailto:info@caisbe.org?subject=Partnership%20inquiry"
  },
  "/partners/become-a-sponsor": {
    "slug": "become-a-sponsor",
    "title": "Commanditer, annoncer ou exposer avec le CAISBE",
    "description": "",
    "lead": "Joignez la communauté de l’environnement bâti, les professionnels, les établissements d’enseignement et les organisations qui façonnent l’avenir de l’environnement bâti au Canada et en Afrique. Devenez partenaire du CAISBE pour présenter vos produits et services, promouvoir votre marque, soutenir la formation professionnelle et bâtir des réseaux précieux dans les secteurs de la gestion des installations, de l’immobilier, de la construction et de la durabilité.",
    "sections": [],
    "ctaLabel": "Devenir commanditaire",
    "ctaHref": "/contact"
  },
  "/privacy-policy": {
    "slug": "privacy-policy",
    "title": "Politique de confidentialité",
    "description": "Politique de confidentialité du site Web de l’Institut canado-africain pour l’environnement bâti durable.",
    "lead": "Comment le CAISBE recueille, utilise et protège les renseignements personnels. Dernière mise à jour : 1er juin 2025.",
    "sections": [
      {
        "title": "Qui nous sommes",
        "body": "L’Institut canado-africain pour l’environnement bâti durable (CAISBE) est un institut international de connaissances, de formation et de développement professionnel dont le siège est situé au 815-4AVE SW, Calgary (Alberta) T2P 5N7, Canada. Nous nous engageons à respecter votre vie privée et à protéger vos renseignements personnels conformément à la LPRPDE et aux lois provinciales applicables en matière de protection de la vie privée.",
        "items": []
      },
      {
        "title": "Renseignements que nous recueillons",
        "body": "Nous pouvons recueillir des données d’identité et de contact, des données de compte, des données financières traitées par des fournisseurs de paiement, l’historique d’inscription et d’adhésion, des données de communication et des données d’analyse technique.",
        "items": []
      },
      {
        "title": "Comment nous utilisons vos renseignements",
        "body": "",
        "items": [
          "Traiter les inscriptions, les adhésions et les paiements",
          "Envoyer des mises à jour de programmes et des infolettres lorsque cela est permis",
          "Répondre aux demandes et offrir du soutien",
          "Respecter nos obligations légales et de sécurité",
          "Améliorer le site Web grâce à des analyses anonymisées"
        ]
      },
      {
        "title": "Vos droits et nous joindre",
        "body": "Vous pouvez demander l’accès, la correction ou la suppression de vos renseignements (sous réserve des obligations légales de conservation), ou retirer votre consentement lorsque le traitement repose sur celui-ci. Communiquez avec info@caisbe.org ou avec le Commissariat à la protection de la vie privée du Canada.",
        "items": []
      }
    ],
    "ctaLabel": "Nous joindre",
    "ctaHref": "/contact"
  },
  "/professional-development": {
    "slug": "professional-development",
    "title": "Programmes de certificat",
    "description": "Explorez les programmes de certificat du CAISBE conçus pour les professionnels de la gestion des installations, de la gestion immobilière et de l’environnement bâti.",
    "lead": "Explorez les programmes de certificat du CAISBE conçus pour les professionnels de la gestion des installations, de la gestion immobilière et de l’environnement bâti.",
    "sections": [
      {
        "title": "Cours de certificat",
        "body": "Programmes de certificat du CAISBE publiés à l’intention des professionnels des installations, de l’immobilier et de l’environnement bâti.",
        "items": []
      },
      {
        "title": "Séminaires",
        "body": "Séminaires professionnels qui complètent les parcours de certificat et soutiennent le perfectionnement continu.",
        "items": []
      },
      {
        "title": "Formats d’apprentissage",
        "body": "Le CAISBE offre ses programmes de certificat selon des formats d’apprentissage souples conçus pour les professionnels en emploi, les étudiants et les organisations.",
        "items": []
      }
    ],
    "ctaLabel": "Formats d’apprentissage",
    "ctaHref": "/professional-development/learning-formats"
  },
  "/professional-development/learning-formats": {
    "slug": "learning-formats",
    "title": "Formats d’apprentissage",
    "description": "Le CAISBE offre ses programmes de certificat selon des formats d’apprentissage souples conçus pour les professionnels en emploi, les étudiants et les organisations.",
    "lead": "Choisissez le format d’apprentissage qui convient à votre horaire, à votre lieu et à vos objectifs.",
    "sections": [
      {
        "title": "Options de formation",
        "body": "",
        "items": [
          "En ligne (à votre rythme)",
          "Classes virtuelles",
          "Formation en classe en personne",
          "Formation en entreprise sur place"
        ]
      }
    ],
    "ctaLabel": "Voir les programmes de certificat",
    "ctaHref": "/professional-development"
  },
  "/professional-development/learning-formats/in-person-classroom-training": {
    "slug": "in-person-classroom-training",
    "title": "Formation en classe en personne",
    "description": "Apprentissage en classe, en face à face, avec des instructeurs experts, du réseautage entre pairs et un environnement concentré.",
    "lead": "Formation en classe avec des instructeurs et du réseautage entre pairs.",
    "sections": [
      {
        "title": "Lieux",
        "body": "Offerte à Addis-Abeba, à Nairobi, en Afrique du Sud, au Canada et dans de nombreux autres endroits dans le monde.",
        "items": []
      }
    ],
    "ctaLabel": "S’inscrire à un cours",
    "ctaHref": "/professional-development"
  },
  "/professional-development/learning-formats/on-site-corporate-training": {
    "slug": "on-site-corporate-training",
    "title": "Formation en entreprise sur place",
    "description": "Nos programmes pour entreprises sont entièrement sur mesure : le contenu et l’horaire sont adaptés aux objectifs et au contexte d’exploitation de votre équipe afin d’assurer une pertinence maximale et un minimum de perturbations.",
    "lead": "Apportez la formation du CAISBE dans votre milieu de travail.",
    "sections": [],
    "ctaLabel": "Communiquez avec nous pour les détails",
    "ctaHref": "/contact"
  },
  "/professional-development/learning-formats/online-self-paced": {
    "slug": "online-self-paced",
    "title": "En ligne (à votre rythme)",
    "description": "Apprenez n’importe quand, n’importe où et à votre rythme, avec un accès 24 h sur 24, 7 jours sur 7 à du matériel numérique interactif, sans horaire fixe.",
    "lead": "Un apprentissage en ligne à votre rythme, conçu pour les professionnels occupés.",
    "sections": [
      {
        "title": "Ce qui est inclus",
        "body": "Les modules comprennent des micro-leçons, des présentations vidéo, des quiz de révision, des examens de pratique et des outils comme des cartes mémoire.",
        "items": []
      }
    ],
    "ctaLabel": "S’inscrire à un cours",
    "ctaHref": "/professional-development"
  },
  "/professional-development/learning-formats/virtual-live-classes": {
    "slug": "virtual-live-classes",
    "title": "Classes virtuelles",
    "description": "Séances en ligne en direct dirigées par un instructeur : joignez-vous de n’importe où et interagissez en temps réel par vidéo, clavardage et outils partagés.",
    "lead": "Des classes en ligne en direct avec interaction en temps réel.",
    "sections": [
      {
        "title": "Comment se déroulent les séances",
        "body": "Les séances combinent l’enseignement en direct et l’étude à votre rythme au moyen de discussions, d’études de cas et d’activités collaboratives.",
        "items": []
      }
    ],
    "ctaLabel": "S’inscrire à un cours",
    "ctaHref": "/professional-development"
  },
  "/projects": {
    "slug": "projects",
    "title": "Projets et initiatives",
    "description": "Des initiatives collaboratives qui font avancer la gestion durable des installations, le renforcement des capacités et le partenariat Afrique–Canada.",
    "lead": "Les projets du CAISBE relient les professionnels, les institutions et les partenaires pour renforcer la pratique, partager les connaissances et soutenir des environnements bâtis résilients.",
    "sections": [
      {
        "title": "Initiatives en cours",
        "body": "",
        "items": [
          "Échange de connaissances Afrique–Canada",
          "Parcours de certification professionnelle",
          "Laboratoires de durabilité des campus et des milieux de travail",
          "Renforcement des capacités des sections",
          "Dialogue sur les politiques de l’environnement bâti",
          "Numérisation des ressources pour les membres"
        ]
      }
    ],
    "ctaLabel": "Nous joindre",
    "ctaHref": "/contact"
  },
  "/resources": {
    "slug": "resources",
    "title": "Ressources",
    "description": "Explorez les ressources du CAISBE, y compris les carrières, le plaidoyer, les outils de connaissances et les médias.",
    "lead": "Outils, carrières, plaidoyer et médias pour les membres de la communauté du CAISBE.",
    "sections": [
      {
        "title": "Ressources en vedette",
        "body": "",
        "items": [
          "Carrières et babillard d’emplois",
          "Plaidoyer et affaires gouvernementales",
          "Centre d’aide du CAISBE",
          "Billets",
          "Canaux médias et magazine"
        ]
      },
      {
        "title": "Outils de connaissances",
        "body": "Parcourez les conseils ESG, les ressources en cas de crise, les outils pour leaders et les rapports de composantes sous « Plus de ressources ».",
        "items": []
      }
    ],
    "ctaLabel": "Parcourir les carrières",
    "ctaHref": "/careers"
  },
  "/resources/advocacy-government-affairs": {
    "slug": "advocacy-government-affairs",
    "title": "Plaidoyer et affaires gouvernementales",
    "description": "Le CAISBE plaide pour une collaboration Afrique–Canada renforcée en gestion des installations, en bâtiments durables et en environnement bâti.",
    "lead": "Nous plaidons pour une collaboration Afrique–Canada renforcée en gestion des installations, en gestion immobilière, en bâtiments durables et en environnement bâti, en favorisant l’échange de connaissances, le dialogue sur les politiques et les partenariats stratégiques entre les gouvernements, l’industrie et les organisations professionnelles.",
    "sections": [
      {
        "title": "Priorités",
        "body": "Nos efforts de plaidoyer visent à soutenir la croissance verte, les infrastructures résilientes face au climat, l’efficacité énergétique, les pratiques d’économie circulaire, les bâtiments à zéro émission nette et à faible empreinte carbone, ainsi que la gestion durable des actifs en Afrique. Nous travaillons à relier les institutions africaines à l’expertise, à l’innovation, aux technologies et aux meilleures pratiques canadiennes dans des domaines comme l’exploitation des installations, les bâtiments intelligents, la construction durable et la gestion du cycle de vie des propriétés.",
        "items": []
      },
      {
        "title": "Parties prenantes",
        "body": "Nous collaborons avec des parties prenantes clés, dont l’Union africaine, des communautés économiques régionales comme le COMESA, les gouvernements nationaux, les municipalités, les associations professionnelles et les organisations fédérales et provinciales canadiennes concernées, afin de faire avancer des politiques et des initiatives qui renforcent les capacités, améliorent la performance des bâtiments et soutiennent le développement économique durable.",
        "items": []
      },
      {
        "title": "Notre objectif",
        "body": "Par la collaboration, la recherche, le plaidoyer politique et le transfert de connaissances, nous visons à soutenir la transition de l’Afrique vers des environnements bâtis durables, efficaces et résilients, tout en créant des occasions d’investissement, d’innovation et de partenariats durables entre l’Afrique et le Canada.",
        "items": []
      },
      {
        "title": "Conseil stratégique",
        "body": "Nous offrons des services-conseils stratégiques qui renforcent la collaboration Afrique–Canada et les environnements bâtis durables. Nos services comprennent :",
        "items": []
      },
      {
        "title": "Conseil et consultation en politiques",
        "body": "Soutenir les gouvernements et les institutions avec des stratégies de bâtiment durable, de gestion des actifs et de gestion des installations.",
        "items": []
      },
      {
        "title": "Échange de connaissances et partenariats",
        "body": "Relier des organisations africaines et canadiennes par des réseaux d’experts, des forums et de la collaboration technique.",
        "items": []
      },
      {
        "title": "Croissance verte et soutien à la durabilité",
        "body": "Promouvoir l’efficacité énergétique, les bâtiments à zéro émission nette, la résilience climatique et des solutions d’infrastructures durables.",
        "items": []
      },
      {
        "title": "Renforcement des capacités et formation",
        "body": "Développer les compétences et les capacités professionnelles des organismes gouvernementaux, des organisations et des professionnels de l’industrie.",
        "items": []
      },
      {
        "title": "En quoi cela aide",
        "body": "Grâce à ces services, nous soutenons le développement d’environnements bâtis résilients, efficaces et durables en Afrique en partageant l’expertise mondiale et en favorisant des partenariats à long terme.",
        "items": []
      }
    ],
    "ctaLabel": "Nous joindre",
    "ctaHref": "/contact"
  },
  "/resources/blog": {
    "slug": "blog",
    "title": "Blogue",
    "description": "Restez informé grâce à des articles et à des commentaires sur la gestion des installations et l’environnement bâti.",
    "lead": "Articles et commentaires sur la pratique de la gestion des installations et l’environnement bâti durable.",
    "sections": [
      {
        "title": "Derniers articles",
        "body": "",
        "items": []
      }
    ],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/resources/crisis-resource-center": {
    "slug": "crisis-resource-center",
    "title": "Centre de ressources en cas de crise",
    "description": "Accédez à des conseils et à des ressources pour soutenir les installations en cas de crise et de perturbation des opérations.",
    "lead": "Des conseils pour aider les équipes des installations à se préparer et à réagir aux perturbations qui touchent les personnes, les opérations et les actifs.",
    "sections": [
      {
        "title": "Thèmes des ressources",
        "body": "",
        "items": [
          "Planification de la continuité et services essentiels",
          "Communication avec les occupants et les parties prenantes",
          "Santé, sécurité et coordination des urgences",
          "Rétablissement, leçons apprises et cycles d’amélioration"
        ]
      },
      {
        "title": "Besoin de soutien?",
        "body": "Communiquez avec le CAISBE pour obtenir des références, des mises en relation avec des pairs ou pour partager avec la communauté du matériel prêt pour les crises.",
        "items": []
      }
    ],
    "ctaLabel": "Joindre le soutien",
    "ctaHref": "/contact"
  },
  "/resources/esg-facility-management": {
    "slug": "esg-facility-management",
    "title": "ESG et gestion des installations",
    "description": "Comprenez comment les principes ESG croisent la gestion des installations et les opérations durables.",
    "lead": "Les priorités environnementales, sociales et de gouvernance se reflètent chaque jour dans la façon dont les installations sont exploitées, mesurées et améliorées.",
    "sections": [
      {
        "title": "Intersection entre la gestion des installations et l’ESG",
        "body": "",
        "items": [
          "Efficacité énergétique, réduction de l’eau et des déchets",
          "Environnements intérieurs sains et équité d’accès",
          "Rapports transparents et approvisionnement responsable",
          "Résilience climatique et sensibilisation aux risques"
        ]
      },
      {
        "title": "Renforcer ses compétences",
        "body": "Utilisez les programmes d’apprentissage et les événements du CAISBE pour relier la stratégie ESG à la pratique opérationnelle.",
        "items": []
      }
    ],
    "ctaLabel": "Voir les programmes d’apprentissage",
    "ctaHref": "/professional-development"
  },
  "/resources/help-desk": {
    "slug": "help-desk",
    "title": "Centre d’aide du CAISBE",
    "description": "Consultez la FAQ du CAISBE pour obtenir des réponses sur les cours, les examens, l’adhésion, le DPC et l’inscription.",
    "lead": "Comment pouvons-nous vous aider?",
    "sections": [
      {
        "title": "Pourquoi choisir le CAISBE?",
        "body": "",
        "items": [
          "Qualifications reconnues par l’industrie",
          "Formation en entreprise",
          "Partenariats mondiaux avec l’industrie",
          "Une communauté grandissante de professionnels, d’étudiants et d’employeurs de l’environnement bâti durable"
        ]
      },
      {
        "title": "Combien de temps dure le programme de certificat?",
        "body": "",
        "items": [
          "La durée varie selon le certificat et peut être de 8 semaines, avec des options de rythme souples."
        ]
      },
      {
        "title": "Puis-je suivre les cours du CAISBE en ligne ou à mon rythme?",
        "body": "",
        "items": [
          "Oui. Le CAISBE offre de l’apprentissage en ligne et des options d’étude en fin de semaine conçues pour les professionnels en emploi au Canada et en Afrique."
        ]
      },
      {
        "title": "Puis-je suivre certains cours en ligne à mon rythme et d’autres en classe?",
        "body": "",
        "items": [
          "Vous pouvez choisir parmi tous les modes de prestation offerts. Une fois que vous avez choisi un mode, vous n’êtes pas obligé de l’utiliser pour les autres cours des programmes de certificat. Vous pouvez combiner les modes selon votre budget, votre disponibilité et vos besoins."
        ]
      },
      {
        "title": "Y a-t-il une limite de temps pour terminer les certificats?",
        "body": "",
        "items": [
          "Les apprenants doivent terminer leur inscription au certificat dans un délai de trois ans. Les apprenants qui choisissent de ne pas le faire dans ce délai seront considérés comme inactifs."
        ]
      },
      {
        "title": "Combien de temps durent les examens de certificat?",
        "body": "",
        "items": [
          "Dans le portail d’apprentissage du CAISBE, vous disposez de deux heures pour terminer vos examens. Vous devez lire et respecter le code de déontologie professionnelle du CAISBE; veuillez donc le lire avant de passer l’examen de votre cours."
        ]
      },
      {
        "title": "Quelle est la note de passage?",
        "body": "",
        "items": [
          "Pour réussir l’examen, vous devez obtenir 70 % ou plus. En cas d’échec, vous ne pouvez pas demander que votre note soit changée en réussite."
        ]
      },
      {
        "title": "Quels types de questions peuvent être posés à l’examen?",
        "body": "",
        "items": [
          "Les examens sont à choix multiples. Chaque chapitre de votre matériel de cours comporte des questions de pratique qui vous préparent au type de questions de l’examen de certificat."
        ]
      },
      {
        "title": "Quand saurai-je comment je me suis débrouillé à l’examen?",
        "body": "",
        "items": [
          "Dès que vous répondez à la dernière question de l’examen, le système indique votre note non officielle. Vous recevrez un résultat officiel dans les quatorze jours suivant l’examen."
        ]
      },
      {
        "title": "Qu’est-ce que le programme de développement professionnel continu du CAISBE?",
        "body": "",
        "items": [
          "Le programme de DPC exige que les diplômés des cours obtiennent 16 points de crédits de formation continue tous les deux ans pour conserver leur statut de certificat de membre. La période de renouvellement de deux ans commence à la date d’obtention du premier certificat."
        ]
      },
      {
        "title": "Comment obtenir mes points de DPC et mes certificats?",
        "body": "",
        "items": [
          "Vous pouvez obtenir vos points de DPC de plusieurs façons. Vous pouvez assister à des conférences, à des séminaires et à des salons professionnels liés à la gestion des installations ou à la gestion immobilière, y compris l’exploitation des bâtiments."
        ]
      },
      {
        "title": "Quel cours devrais-je suivre en premier?",
        "body": "",
        "items": [
          "Vous pouvez suivre les cours dans l’ordre de votre choix. Si vous n’avez pas d’expérience en exploitation des installations, commencez par le cours Principes fondamentaux : il couvre un peu tous les aspects de l’exploitation des installations et vous trouverez les autres cours plus faciles par la suite."
        ]
      },
      {
        "title": "Y a-t-il une limite de temps pour terminer les programmes de certificat?",
        "body": "",
        "items": [
          "Les apprenants doivent terminer leur inscription au certificat dans un délai d’un an. Passé ce délai, les membres seront considérés comme inactifs."
        ]
      }
    ],
    "ctaLabel": "Ouvrir un billet de soutien",
    "ctaHref": "/resources/tickets"
  },
  "/resources/leader-tools": {
    "slug": "leader-tools",
    "title": "Outils pour leaders",
    "description": "Outils et ressources pour soutenir les dirigeants de sections, les bénévoles et la mobilisation des membres.",
    "lead": "Des outils pratiques pour les dirigeants de sections et les bénévoles qui font grandir les communautés locales du CAISBE.",
    "sections": [
      {
        "title": "Types d’outils inclus",
        "body": "",
        "items": [
          "Listes de vérification pour la planification de réunions et d’événements",
          "Idées et modèles de mobilisation des membres",
          "Notes d’accueil pour les nouveaux bénévoles",
          "Aide-mémoire pour les rapports et les communications"
        ]
      },
      {
        "title": "Obtenir la trousse",
        "body": "Les leaders peuvent demander à l’équipe de l’Institut les modèles à jour et le matériel d’orientation.",
        "items": []
      }
    ],
    "ctaLabel": "Demander les outils pour leaders",
    "ctaHref": "/contact"
  },
  "/resources/magazine": {
    "slug": "magazine",
    "title": "Magazine du CAISBE",
    "description": "Articles et nouvelles du magazine du CAISBE pour les professionnels de la gestion des installations.",
    "lead": "Articles et nouvelles de praticiens qui façonnent la gestion des installations en Afrique et au Canada.",
    "sections": [
      {
        "title": "Derniers numéros",
        "body": "",
        "items": []
      }
    ],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/resources/media": {
    "slug": "media",
    "title": "Médias",
    "description": "Restez en contact avec le CAISBE grâce à notre magazine, à nos vidéos, à notre balado et à notre blogue.",
    "lead": "Restez en contact avec le CAISBE grâce à notre magazine, à nos vidéos, à notre balado et à notre blogue.",
    "sections": [],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/resources/podcast": {
    "slug": "podcast",
    "title": "Balado",
    "description": "Écoutez des conversations avec des leaders qui façonnent la gestion des installations en Afrique et au Canada.",
    "lead": "Des conversations avec des leaders sur les opérations, la durabilité et la collaboration Afrique–Canada.",
    "sections": [
      {
        "title": "Derniers épisodes",
        "body": "",
        "items": []
      }
    ],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/resources/tickets": {
    "slug": "tickets",
    "title": "Billets",
    "description": "Connectez-vous pour voir vos billets de soutien CAISBE ou en soumettre un nouveau.",
    "lead": "Connectez-vous pour voir vos billets de soutien ou en soumettre un nouveau.",
    "sections": [],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/resources/youtube": {
    "slug": "youtube",
    "title": "YouTube",
    "description": "Regardez les vidéos du CAISBE, les faits saillants d’événements et du contenu éducatif.",
    "lead": "Séances vidéo, faits saillants d’événements et courtes capsules d’apprentissage des programmes du CAISBE.",
    "sections": [
      {
        "title": "Dernières vidéos",
        "body": "",
        "items": []
      }
    ],
    "ctaLabel": "",
    "ctaHref": ""
  },
  "/store": {
    "slug": "store",
    "title": "Librairie du CAISBE",
    "description": "Publications, guides et documents pour les membres qui soutiennent la pratique de la gestion des installations en Afrique et au Canada.",
    "lead": "La librairie du CAISBE propose une sélection de lectures professionnelles pour les gestionnaires d’installations, les professionnels de l’immobilier, les éducateurs et les partenaires.",
    "sections": [
      {
        "title": "Catégories",
        "body": "",
        "items": [
          "Publications",
          "Guides de pratique",
          "Documents pour les membres"
        ]
      },
      {
        "title": "Comment commander",
        "body": "",
        "items": [
          "Parcourez les titres en vedette et notez les documents qui conviennent à votre équipe ou à votre section",
          "Communiquez avec le CAISBE en indiquant les titres, la quantité et le lieu de livraison",
          "Notre équipe confirmera la disponibilité, les prix et les options d’expédition ou de livraison numérique"
        ]
      }
    ],
    "ctaLabel": "Nous contacter pour commander",
    "ctaHref": "/contact"
  }
};
