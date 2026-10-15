from pydantic import BaseModel, Field


class SiteSection(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = ""
    items: list[str] = Field(default_factory=list, max_length=30)


class SitePageIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    menu_label: str = Field(default="", max_length=120)
    slug: str = Field(min_length=1, max_length=80)
    parent_id: int | None = None
    description: str = ""
    lead: str = ""
    sections: list[SiteSection] = Field(default_factory=list, max_length=20)
    cta_label: str | None = Field(default=None, max_length=120)
    cta_href: str | None = Field(default=None, max_length=500)
    sort_order: int = 0
    show_in_menu: bool = True
    status: str = "draft"


class SitePageOut(BaseModel):
    id: int
    parent_id: int | None = None
    title: str
    menu_label: str
    slug: str
    path: str
    description: str
    lead: str
    sections: list[SiteSection] = Field(default_factory=list)
    cta_label: str | None = None
    cta_href: str | None = None
    sort_order: int
    show_in_menu: bool
    status: str

    model_config = {"from_attributes": True}


class SiteNavItem(BaseModel):
    menu_label: str
    path: str
    parent_path: str | None = None
    sort_order: int = 0


class SiteNavOut(BaseModel):
    items: list[SiteNavItem] = Field(default_factory=list)


class HomeStat(BaseModel):
    value: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=160)


class HomeCard(BaseModel):
    title: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=4000)


class HomeOffice(BaseModel):
    region: str = Field(default="", max_length=80)
    address: str = Field(default="", max_length=400)
    map_query: str = Field(default="", max_length=300)


class HomeLandingIn(BaseModel):
    tagline: str = Field(
        default="Transforming Buildings. Empowering Communities.",
        min_length=1,
        max_length=200,
    )
    hero_intro: str = Field(
        default=(
            "CAISBE prepares the next generation of facility and property management professionals to lead "
            "sustainable transformation across buildings and infrastructure in Africa — leveraging Canadian "
            "expertise, global standards, and green innovation. Join for world-class education, industry "
            "standards, and professional membership."
        ),
        min_length=1,
        max_length=2000,
    )
    hero_button: str = Field(default="Join CAISBE", max_length=80)
    stats: list[HomeStat] = Field(
        default_factory=lambda: [
            HomeStat(value="12+", label="Certified courses"),
            HomeStat(value="25+", label="Aggregate years of experience in the field"),
            HomeStat(value="12+", label="African based trade and professionals associations"),
            HomeStat(value="1520+", label="Members & counting more daily"),
        ],
        min_length=1,
        max_length=8,
    )
    about_eyebrow: str = Field(default="Years Of Undefeated Success", max_length=120)
    about_body: str = Field(
        default=(
            "The Canada Africa Institute for the Sustainable Built Environment (CAISBE) was established to bridge "
            "the knowledge, technology, and capacity gaps between Canada and Africa in the fields of sustainable "
            "construction, resilient infrastructure, real estate development, and environmental stewardship. As "
            "African cities expand rapidly and Canada advances in green technologies and climate-resilient design, "
            "CAISBE provides a collaborative platform where best practices, research, and professional training come together."
        ),
        max_length=4000,
    )
    about_cta: str = Field(default="Work With Us", max_length=80)
    about_highlights: list[HomeCard] = Field(
        default_factory=lambda: [
            HomeCard(
                title="Sustainability",
                description=(
                    "Promoting environmentally responsible facility operations through energy efficiency, renewable energy "
                    "solutions, water conservation, waste reduction, green building practices, and net-zero strategies."
                ),
            ),
            HomeCard(
                title="Modern Technology",
                description=(
                    "Advancing the use of technology to improve building performance through smart building systems, IoT "
                    "sensors, computerized maintenance management systems (CMMS), building automation, data analytics, "
                    "and digital facility management solutions."
                ),
            ),
            HomeCard(
                title="Local Innovation & Indigenous Knowledge",
                description=(
                    "Combining global best practices with local African expertise, traditional knowledge, and innovative "
                    "solutions to develop facility management approaches that are practical, affordable, and suitable for "
                    "local environments."
                ),
            ),
        ],
        max_length=6,
    )
    certificates_title: str = Field(default="Build Your FM Team", max_length=160)
    certificates_subtitle: str = Field(default="Quality Educational Certification programs", max_length=240)
    certificates_cta: str = Field(default="View All", max_length=80)
    magazine_title: str = Field(default="CAISBE Magazine", max_length=160)
    magazine_subtitle: str = Field(
        default="Read the latest features and insights from across the CAISBE community.",
        max_length=300,
    )
    magazine_cta: str = Field(default="View all issues", max_length=80)
    practice_eyebrow: str = Field(default="Practice", max_length=80)
    practice_title: str = Field(default="We Follow Best Practices", max_length=200)
    practice_body: str = Field(default="We follow best practices and scaling it up to Africa", max_length=500)
    practice_items: list[HomeCard] = Field(
        default_factory=lambda: [
            HomeCard(
                title="Sustainability",
                description=(
                    "Promoting environmentally responsible facility operations through energy efficiency, renewable energy "
                    "solutions, water conservation, waste reduction, green building practices, and net-zero strategies. "
                    "Canadian sustainability expertise can support African organizations in developing resilient, low-carbon, "
                    "and cost-effective facilities."
                ),
            ),
            HomeCard(
                title="Modern Technology",
                description=(
                    "Advancing the use of technology to improve building performance through smart building systems, IoT "
                    "sensors, computerized maintenance management systems (CMMS), building automation, data analytics, and "
                    "digital facility management solutions."
                ),
            ),
            HomeCard(
                title="Local Innovation & Indigenous Knowledge",
                description=(
                    "Combining global best practices with local African expertise, traditional knowledge, and innovative "
                    "solutions to develop facility management approaches that are practical, affordable, and suitable for "
                    "local environments."
                ),
            ),
            HomeCard(
                title="Professional Development & Capacity Building",
                description=(
                    "Building a skilled Facility Management workforce through training, certification, mentorship, and "
                    "knowledge-sharing programs that connect Canadian experience with African industry needs."
                ),
            ),
            HomeCard(
                title="Lifecycle Asset Management",
                description=(
                    "Promoting proactive maintenance, asset planning, and lifecycle strategies that improve building "
                    "performance, reduce operational costs, and maximize long-term value of infrastructure investments."
                ),
            ),
        ],
        max_length=8,
    )
    offices_title: str = Field(default="Offices", max_length=80)
    offices: list[HomeOffice] = Field(
        default_factory=lambda: [
            HomeOffice(
                region="Canada",
                address="815-4AVE SW, CALGARY Alberta,\nT2P 5N7",
                map_query="815 4 Ave SW, Calgary, AB T2P 5N7, Canada",
            ),
            HomeOffice(
                region="United States",
                address="191 Peachtree Street NE,\nAtlanta, GA 30303, USA",
                map_query="191 Peachtree Street NE, Atlanta, GA 30303, USA",
            ),
            HomeOffice(
                region="Africa",
                address="African Union, Mexico Road,\nRosvelt Street, Addis Ababa",
                map_query="African Union, Mexico Road, Rosvelt Street, Addis Ababa, Ethiopia",
            ),
        ],
        max_length=6,
    )
    testimonials_eyebrow: str = Field(default="Testimonials", max_length=80)
    testimonials_title: str = Field(default="What Our Course Participants Say", max_length=200)
    contact_eyebrow: str = Field(default="Contact Us", max_length=80)
    contact_title: str = Field(default="Contact Us", max_length=120)
    contact_lead: str = Field(
        default="Thank you for your interest in CAISBE Education. Let us know how we can help!",
        max_length=500,
    )
    contact_address: str = Field(default="815-4Ave SW, Calgary, AB\nTWP 3G8", max_length=400)
    contact_phone: str = Field(default="1825-454-5383 / 4039039047 / 4048349904", max_length=120)
    contact_email: str = Field(default="info@caisbe.org", max_length=160)
    contact_hours: str = Field(default="Weekdays: 9am to 5pm ET", max_length=160)
    contact_form_heading: str = Field(default="How can we help", max_length=120)
    contact_cta: str = Field(default="Send Message", max_length=80)


class HomeLandingOut(HomeLandingIn):
    pass


DEFAULT_HOME_FR = HomeLandingIn(
    tagline="Transformer les bâtiments. Autonomiser les communautés.",
    hero_intro=(
        "Le CAISBE prépare la prochaine génération de professionnels de la gestion des installations et de "
        "l'immobilier à mener une transformation durable des bâtiments et des infrastructures en Afrique — "
        "en s'appuyant sur l'expertise canadienne, les normes mondiales et l'innovation verte. Rejoignez-nous "
        "pour une formation de calibre mondial, des normes sectorielles et une adhésion professionnelle."
    ),
    hero_button="Rejoindre le CAISBE",
    stats=[
        HomeStat(value="12+", label="Cours certifiés"),
        HomeStat(value="25+", label="Années d'expérience cumulées sur le terrain"),
        HomeStat(value="12+", label="Associations professionnelles et sectorielles basées en Afrique"),
        HomeStat(value="1520+", label="Membres et une communauté qui grandit chaque jour"),
    ],
    about_eyebrow="Des années de réussite continue",
    about_body=(
        "L'Institut Canada-Afrique pour l'environnement bâti durable (CAISBE) a été créé pour combler les écarts "
        "de connaissances, de technologies et de capacités entre le Canada et l'Afrique dans les domaines de la "
        "construction durable, des infrastructures résilientes, du développement immobilier et de la gérance "
        "environnementale. Alors que les villes africaines connaissent une croissance rapide et que le Canada "
        "progresse dans les technologies vertes et la conception résiliente au climat, le CAISBE offre une "
        "plateforme collaborative où convergent les meilleures pratiques, la recherche et la formation professionnelle."
    ),
    about_cta="Travailler avec nous",
    about_highlights=[
        HomeCard(
            title="Durabilité",
            description=(
                "Promouvoir une exploitation écoresponsable des installations grâce à l'efficacité énergétique, "
                "aux énergies renouvelables, à la conservation de l'eau, à la réduction des déchets, aux pratiques "
                "de bâtiment durable et aux stratégies carboneutres."
            ),
        ),
        HomeCard(
            title="Technologie moderne",
            description=(
                "Faire progresser l'utilisation de la technologie pour améliorer la performance des bâtiments grâce "
                "aux systèmes intelligents, aux capteurs IoT, à la GMAO, à l'automatisation du bâtiment, à l'analyse "
                "de données et aux solutions numériques de gestion des installations."
            ),
        ),
        HomeCard(
            title="Innovation locale et savoirs autochtones",
            description=(
                "Allier les meilleures pratiques mondiales à l'expertise africaine locale, aux savoirs traditionnels "
                "et aux solutions innovantes afin de concevoir des approches de gestion des installations pratiques, "
                "abordables et adaptées aux réalités locales."
            ),
        ),
    ],
    certificates_title="Formez votre équipe en gestion des installations",
    certificates_subtitle="Programmes de certification éducative de qualité",
    certificates_cta="Voir tout",
    magazine_title="Magazine CAISBE",
    magazine_subtitle="Découvrez les derniers dossiers et analyses de la communauté CAISBE.",
    magazine_cta="Voir tous les numéros",
    practice_eyebrow="Pratique",
    practice_title="Nous suivons les meilleures pratiques",
    practice_body="Nous appliquons les meilleures pratiques et les déployons à l'échelle de l'Afrique",
    practice_items=[
        HomeCard(
            title="Durabilité",
            description=(
                "Promouvoir une exploitation écoresponsable des installations grâce à l'efficacité énergétique, "
                "aux énergies renouvelables, à la conservation de l'eau, à la réduction des déchets, aux pratiques "
                "de bâtiment durable et aux stratégies carboneutres. L'expertise canadienne en durabilité accompagne "
                "les organisations africaines dans le développement d'installations résilientes, sobres en carbone et rentables."
            ),
        ),
        HomeCard(
            title="Technologie moderne",
            description=(
                "Faire progresser l'utilisation de la technologie pour améliorer la performance des bâtiments grâce "
                "aux systèmes intelligents, aux capteurs IoT, à la GMAO, à l'automatisation du bâtiment, à l'analyse "
                "de données et aux solutions numériques de gestion des installations."
            ),
        ),
        HomeCard(
            title="Innovation locale et savoirs autochtones",
            description=(
                "Allier les meilleures pratiques mondiales à l'expertise africaine locale, aux savoirs traditionnels "
                "et aux solutions innovantes afin de concevoir des approches de gestion des installations pratiques, "
                "abordables et adaptées aux réalités locales."
            ),
        ),
        HomeCard(
            title="Perfectionnement professionnel et renforcement des capacités",
            description=(
                "Développer une main-d'œuvre qualifiée en gestion des installations par la formation, la certification, "
                "le mentorat et des programmes de partage des connaissances reliant l'expérience canadienne aux besoins "
                "du secteur en Afrique."
            ),
        ),
        HomeCard(
            title="Gestion du cycle de vie des actifs",
            description=(
                "Promouvoir la maintenance proactive, la planification des actifs et des stratégies sur l'ensemble du "
                "cycle de vie qui améliorent la performance des bâtiments, réduisent les coûts d'exploitation et "
                "maximisent la valeur à long terme des investissements en infrastructures."
            ),
        ),
    ],
    offices_title="Bureaux",
    offices=[
        HomeOffice(
            region="Canada",
            address="815-4AVE SW, CALGARY Alberta,\nT2P 5N7",
            map_query="815 4 Ave SW, Calgary, AB T2P 5N7, Canada",
        ),
        HomeOffice(
            region="États-Unis",
            address="191 Peachtree Street NE,\nAtlanta, GA 30303, USA",
            map_query="191 Peachtree Street NE, Atlanta, GA 30303, USA",
        ),
        HomeOffice(
            region="Afrique",
            address="Union africaine, Mexico Road,\nRosvelt Street, Addis-Abeba",
            map_query="African Union, Mexico Road, Rosvelt Street, Addis Ababa, Ethiopia",
        ),
    ],
    testimonials_eyebrow="Témoignages",
    testimonials_title="Ce que disent les participants à nos cours",
    contact_eyebrow="Nous contacter",
    contact_title="Nous contacter",
    contact_lead="Merci de votre intérêt pour les formations du CAISBE. Dites-nous comment nous pouvons vous aider !",
    contact_address="815-4Ave SW, Calgary, AB\nTWP 3G8",
    contact_phone="1825-454-5383 / 4039039047 / 4048349904",
    contact_email="info@caisbe.org",
    contact_hours="En semaine : 9 h à 17 h HE",
    contact_form_heading="Comment pouvons-nous vous aider ?",
    contact_cta="Envoyer le message",
)

