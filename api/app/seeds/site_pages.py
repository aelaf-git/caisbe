"""Copy public marketing pages into the Admin Pages editor once (matched by path)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import SitePage
from app.services.site_pages import _assign_paths, _pages

Section = dict


def _sections(*parts: tuple[str, str, list[str]]) -> list[Section]:
    return [{"title": title, "body": body, "items": items} for title, body, items in parts]


ABOUT_PAGES = [
    {
        "slug": "what-is-built-environment",
        "title": "What is the Built Environment?",
        "description": (
            "Learn what the Built Environment means and why Facility Management is essential "
            "to sustainable development across Africa."
        ),
        "lead": (
            "The Built Environment refers to the human-made spaces and systems where people live, "
            "work, and interact, including buildings, infrastructure, and the services required to "
            "operate and maintain them."
        ),
        "sections": _sections(
            (
                "Facility Management perspective",
                (
                    "From a Facility Management perspective, the Built Environment focuses on managing "
                    "assets safely, efficiently, sustainably, and throughout their lifecycle."
                ),
                [],
            ),
            (
                "Why it matters in Africa",
                (
                    "In Africa, effective Facility Management is essential to support rapid urbanization, "
                    "infrastructure growth, and sustainable development. By applying global best practices, "
                    "innovation, and local expertise, Facility Management helps improve building performance, "
                    "asset value, energy efficiency, resilience, and quality of life across communities."
                ),
                [],
            ),
            (
                "Africa–Canada collaboration",
                (
                    "Through Africa–Canada collaboration, shared expertise, innovation, and capacity building "
                    "can support the development of smarter, greener, and more resilient built environments "
                    "that create long-term social, economic, and environmental benefits."
                ),
                [],
            ),
        ),
        "cta_label": "About CAISBE",
        "cta_href": "/about",
    },
    {
        "slug": "board-of-directors",
        "title": "Board of Directors",
        "description": "Meet the leadership guiding CAISBE strategy, governance, and professional standards.",
        "lead": "The Board guides CAISBE strategy, stewardship, and professional standards across Africa–Canada collaboration.",
        "sections": _sections(
            (
                "Board focus",
                "",
                [
                    "Strategic direction and institutional integrity",
                    "Oversight of programs, partnerships, and finances",
                    "Advancing professional excellence in the built environment",
                ],
            ),
            (
                "Leadership areas",
                "",
                [
                    "Chair and executive officers",
                    "Program and membership stewardship",
                    "Regional and partnership liaison roles",
                ],
            ),
            (
                "Connect with leadership",
                "For board correspondence, nominations, or governance questions, contact the institute office.",
                [],
            ),
        ),
        "cta_label": "Contact the Board Office",
        "cta_href": "/contact",
    },
    {
        "slug": "staff",
        "title": "Staff",
        "description": "Get to know the CAISBE team supporting members, programs, and partnerships.",
        "lead": "CAISBE staff support members, programs, events, and day-to-day institute operations.",
        "sections": _sections(
            (
                "How the team supports you",
                "",
                [
                    "Membership onboarding and renewals",
                    "Professional development coordination",
                    "Events, communications, and partner relations",
                    "Office support across Canada and Africa locations",
                ],
            ),
            (
                "Reach the team",
                "Use the Contact page for general inquiries, or email the office listed for your region.",
                [],
            ),
        ),
        "cta_label": "Contact Staff",
        "cta_href": "/contact",
    },
    {
        "slug": "governance",
        "title": "Governance",
        "description": "Learn how CAISBE is governed to serve members and advance the profession.",
        "lead": "CAISBE is governed to serve members, protect institutional trust, and advance the profession responsibly.",
        "sections": _sections(
            (
                "Governance principles",
                "",
                [
                    "Transparency and accountability to members",
                    "Clear roles for board, staff, and volunteers",
                    "Ethical stewardship of programs and partnerships",
                    "Alignment with mission and long-term impact",
                ],
            ),
            (
                "Policies and questions",
                "Review related policies such as our Privacy Policy, and contact us for governance documentation requests.",
                [],
            ),
        ),
        "cta_label": "Privacy Policy",
        "cta_href": "/privacy-policy",
    },
    {
        "slug": "volunteering",
        "title": "Volunteering",
        "description": "Discover ways to volunteer and contribute to CAISBE programs and community initiatives.",
        "lead": "Volunteers help deliver events, mentor peers, support chapters, and grow the professional community.",
        "sections": _sections(
            (
                "Ways to contribute",
                "",
                [
                    "Event and forum support",
                    "Chapter leadership and member engagement",
                    "Mentoring and knowledge sharing",
                    "Committees for programs, awards, and outreach",
                ],
            ),
            (
                "Get started",
                "Tell us your interests and availability—we will match you with opportunities that fit your skills. Email info@caisbe.org to begin.",
                [],
            ),
        ),
        "cta_label": "Get started",
        "cta_href": "mailto:info@caisbe.org?subject=Volunteer%20inquiry",
    },
    {
        "slug": "brand-assets",
        "title": "Brand Assets",
        "description": "Access CAISBE brand guidelines and assets for approved partner and media use.",
        "lead": "Approved partners and media can request CAISBE brand assets and usage guidance.",
        "sections": _sections(
            (
                "Available on request",
                "",
                [
                    "Primary logo files for digital and print",
                    "Color and typography guidance",
                    "Co-branding notes for events and partnerships",
                ],
            ),
            (
                "Usage expectations",
                "",
                [
                    "Do not alter logo proportions or colors without approval",
                    "Keep clear space around the mark",
                    "Use assets only for approved CAISBE-related communications",
                ],
            ),
            (
                "Request assets",
                "Email the communications team with your organization name, intended use, and deadline.",
                [],
            ),
        ),
        "cta_label": "Request Brand Assets",
        "cta_href": "/contact",
    },
]

RESOURCE_PAGES = [
    {
        "slug": "esg-facility-management",
        "title": "ESG + Facility Management",
        "description": "Understand how ESG principles intersect with facility management and sustainable operations.",
        "lead": "Environmental, social, and governance priorities show up daily in how facilities are run, measured, and improved.",
        "sections": _sections(
            (
                "FM and ESG intersection",
                "",
                [
                    "Energy efficiency, water, and waste reduction",
                    "Healthy indoor environments and equity of access",
                    "Transparent reporting and responsible procurement",
                    "Climate resilience and risk awareness",
                ],
            ),
            (
                "Build capability",
                "Use CAISBE learning programs and events to connect ESG strategy with operational practice.",
                [],
            ),
        ),
        "cta_label": "View Learning Programs",
        "cta_href": "/professional-development",
    },
    {
        "slug": "crisis-resource-center",
        "title": "Crisis Resource Center",
        "description": "Access guidance and resources to support facilities during crises and operational disruptions.",
        "lead": "Guidance to help facility teams prepare for and respond to disruptions that affect people, operations, and assets.",
        "sections": _sections(
            (
                "Resource themes",
                "",
                [
                    "Continuity planning and essential services",
                    "Communication with occupants and stakeholders",
                    "Health, safety, and emergency coordination",
                    "Recovery, lessons learned, and improvement cycles",
                ],
            ),
            (
                "Need support?",
                "Contact CAISBE for referrals, peer connections, or to share crisis-ready materials with the community.",
                [],
            ),
        ),
        "cta_label": "Contact Support",
        "cta_href": "/contact",
    },
    {
        "slug": "leader-tools",
        "title": "Leader Tools",
        "description": "Tools and resources to support chapter leaders, volunteers, and member engagement.",
        "lead": "Practical tools for chapter leaders and volunteers who grow local CAISBE communities.",
        "sections": _sections(
            (
                "Included tool types",
                "",
                [
                    "Meeting and event planning checklists",
                    "Member engagement ideas and templates",
                    "Onboarding notes for new volunteers",
                    "Reporting and communication prompts",
                ],
            ),
            (
                "Get the pack",
                "Leaders can request current templates and orientation materials from the institute team.",
                [],
            ),
        ),
        "cta_label": "Request Leader Tools",
        "cta_href": "/contact",
    },
    {
        "slug": "component-reports",
        "title": "Component Reports",
        "description": "Reports and updates supporting CAISBE components, chapters, and member communities.",
        "lead": "Updates that help components and chapters share progress, priorities, and learning across the network.",
        "sections": _sections(
            (
                "What reports support",
                "",
                [
                    "Chapter activity and membership snapshots",
                    "Program outcomes and event summaries",
                    "Shared priorities across regions",
                ],
            ),
            (
                "Questions",
                "For questions about published summaries or regional activity, contact the CAISBE team.",
                [],
            ),
        ),
        "cta_label": "Contact Us",
        "cta_href": "/contact",
    },
]

ABOUT_INDEX = {
    "title": "About the Canada Africa Institute for the Sustainable Built Environment (CAISBE)",
    "menu_label": "About CAISBE",
    "description": (
        "Learn about CAISBE mission, leadership, accreditation, and commitment to raising professional FM standards."
    ),
    "lead": (
        "The Canada Africa Institute for the Sustainable Built Environment (CAISBE) is an international "
        "knowledge, training, and innovation hub dedicated to advancing sustainable construction, resilient "
        "infrastructure, and environmentally responsible real estate development across Africa."
    ),
    "sections": _sections(
        (
            "Our Mission",
            (
                "To strengthen the built environment through education, innovation, and collaboration, enabling "
                "professionals, institutions, and policymakers to design, construct, and manage sustainable, "
                "resilient, and efficient buildings and infrastructure."
            ),
            [],
        ),
        (
            "Our Vision",
            (
                "A world where every community has access to sustainable buildings, climate-resilient "
                "infrastructure, and inclusive urban systems that support the wellbeing of current and future generations."
            ),
            [],
        ),
        (
            "What We Do",
            "",
            [
                "Professional certifications",
                "Corporate training & consultancy",
                "Research, standards, and industry guidelines",
                "Membership and CPD programming",
                "Events, conferences, and knowledge sharing",
                "Advocacy and Policy dialogue",
            ],
        ),
    ),
    "cta_label": "Contact Us",
    "cta_href": "/contact",
}

RESOURCES_INDEX = {
    "title": "Resources",
    "menu_label": "Resources",
    "description": "Explore CAISBE resources including careers, advocacy, knowledge tools, and media.",
    "lead": "Tools, careers, advocacy, and member media for the CAISBE community.",
    "sections": _sections(
        (
            "Featured resources",
            "",
            [
                "Careers & Job Board",
                "Advocacy and Government Affairs",
                "CAISBE Help Desk",
                "Tickets",
                "Media channels and magazine",
            ],
        ),
        (
            "Knowledge tools",
            "Browse ESG guidance, crisis resources, leader tools, and component reports under More Resources.",
            [],
        ),
    ),
    "cta_label": "Browse careers",
    "cta_href": "/careers",
}

MEMBERSHIP_PAGES = [
    {
        "slug": "overview",
        "title": "Membership Overview and Benefits",
        "description": (
            "Facility Management is a multidisciplinary profession that ensures the efficient operation, "
            "maintenance, safety, and sustainability of the built environment."
        ),
        "lead": (
            "Facility Management integrates people, places, processes, and technology to support organizational "
            "objectives. FM encompasses building operations, asset management, health and safety, space planning, "
            "and environmental sustainability."
        ),
        "sections": _sections(
            (
                "Membership value",
                "Join a growing community of facility management professionals, students, and organizations.",
                [
                    "Training and professional development",
                    "Industry insights and standards",
                    "Networking across Africa and Canada",
                ],
            ),
        ),
        "cta_label": "Join CAISBE",
        "cta_href": "/membership/join",
    },
    {
        "slug": "join",
        "title": "Join CAISBE",
        "menu_label": "Join / Register / Renew",
        "description": (
            "Become part of a growing community of facility management professionals, students, and "
            "organizations—or renew your existing membership."
        ),
        "lead": (
            "Whether you are beginning your career, expanding your professional network, renewing your membership, "
            "or representing an organization, membership provides access to training, industry insights, and networking."
        ),
        "sections": _sections(
            (
                "Next step",
                "Register or renew today and take the next step in your professional journey with CAISBE.",
                [],
            ),
        ),
        "cta_label": "Become a Member",
        "cta_href": "/membership/become-a-member",
    },
    {
        "slug": "types",
        "title": "Membership Categories",
        "menu_label": "Types of Membership",
        "description": "Explore CAISBE membership categories for students, professionals, organizations, and institutions.",
        "lead": "Choose the membership category that fits your role and goals.",
        "sections": _sections(
            (
                "Student Membership",
                (
                    "Designed for students pursuing studies in Facility Management, Engineering, Architecture, "
                    "Construction, Real Estate, or related fields."
                ),
                ["Career development resources", "Mentorship and educational events", "Training discounts"],
            ),
            (
                "Professional Membership",
                "For individuals working in Facility Management and the built environment.",
                [
                    "Professional development and certification pathways",
                    "Industry networking and conferences",
                    "Technical resources and member events",
                ],
            ),
            (
                "Corporate Membership",
                "For organizations committed to excellence in Facility Management.",
                [
                    "Organizational visibility",
                    "Staff development and discounted training",
                    "Sponsorship and partnership benefits",
                ],
            ),
            (
                "Senior Member / Fellow",
                "For leadership-level professionals with distinguished service in Facility Management.",
                [],
            ),
            (
                "Institutional Member",
                "For universities, agencies, government bodies, and NGOs advancing education and practice.",
                [],
            ),
        ),
        "cta_label": "Join now",
        "cta_href": "/membership/become-a-member",
    },
    {
        "slug": "become-a-member",
        "title": "Become a Member",
        "description": "Join CAISBE or renew your membership to access training, networking, and professional resources.",
        "lead": "Start or renew your membership to unlock CAISBE learning, networking, and member resources.",
        "sections": _sections(
            (
                "How to proceed",
                "Use Join Now to register, or Renew Membership if you already belong to CAISBE.",
                [],
            ),
        ),
        "cta_label": "Join Now",
        "cta_href": "/membership/forms/application",
    },
]

MEMBERSHIP_INDEX = {
    "title": "Membership",
    "menu_label": "Membership",
    "description": "Membership overview, join and renew options, and membership categories.",
    "lead": "Grow your career and organization with CAISBE membership benefits, learning, and community.",
    "sections": _sections(
        (
            "Explore membership",
            "",
            [
                "Membership Overview and Benefits",
                "Join / Register / Renew",
                "Types of Membership",
            ],
        ),
    ),
    "cta_label": "Become a Member",
    "cta_href": "/membership/become-a-member",
}

EVENTS_PAGES = [
    {
        "slug": "expo",
        "title": "Africa–Canada Built Environment Expo & Forum",
        "description": (
            "A premier international platform for collaboration, innovation, and sustainable development "
            "across the built environment sector."
        ),
        "lead": (
            "The Expo & Forum brings together industry leaders, policymakers, investors, academics, and "
            "professionals to foster collaboration and sustainable development."
        ),
        "sections": _sections(
            (
                "Objectives",
                "",
                [
                    "Promote knowledge exchange and best practices between Africa and Canada",
                    "Showcase innovative technologies, products, and sustainable solutions",
                    "Facilitate investment, trade, and strategic partnerships",
                    "Strengthen professional networks and capacity building",
                    "Advance resilient, smart, and sustainable infrastructure across Africa",
                ],
            ),
            (
                "Participants",
                (
                    "Government agencies, facility and property managers, engineers, architects, urban planners, "
                    "construction firms, real estate developers, technology providers, academic institutions, "
                    "investors, development partners, NGOs, and industry associations from Africa and Canada."
                ),
                [],
            ),
        ),
        "cta_label": "Join and Participate",
        "cta_href": "/events/calendar",
    },
    {
        "slug": "conferences",
        "title": "Conferences and Webinars",
        "menu_label": "Conferences and Webinars",
        "description": (
            "Stay connected through conferences and webinars focused on facility management, sustainability, "
            "and built environment collaboration between Africa and Canada."
        ),
        "lead": "Conferences and webinars that keep practitioners current on FM practice, sustainability, and collaboration.",
        "sections": _sections(
            (
                "Session themes",
                "",
                [
                    "Technical sessions on operations, assets, and workplace",
                    "Policy and sustainability dialogues",
                    "Case studies from African and Canadian organizations",
                    "Networking with peers, educators, and partners",
                ],
            ),
            (
                "Get involved",
                "Propose a session topic or ask to be notified when registration opens for the next conference series.",
                [],
            ),
        ),
        "cta_label": "Propose or Register Interest",
        "cta_href": "/contact",
    },
    {
        "slug": "get-involved",
        "title": "Get Involved",
        "description": (
            "Take part in CAISBE events as a speaker, volunteer, partner, or attendee. Join our community and help "
            "shape conversations that advance the sustainable built environment."
        ),
        "lead": "There are many ways to contribute—speak, volunteer, partner, or attend.",
        "sections": _sections(
            (
                "Ways to contribute",
                "",
                [
                    "Speak at a forum, webinar, or chapter program",
                    "Volunteer at events and support attendee experience",
                    "Partner on programming or outreach",
                    "Attend and grow your professional network",
                ],
            ),
            (
                "Tell us your interests",
                "Share your interests and we will help match you with the right opportunity.",
                [],
            ),
        ),
        "cta_label": "Get Involved",
        "cta_href": "/contact",
    },
    {
        "slug": "sponsor",
        "title": "Sponsor and Advertise",
        "description": (
            "Showcase your organization to an international audience of facility management and built environment "
            "professionals. Explore sponsorship, advertising, and exhibition opportunities at CAISBE events."
        ),
        "lead": "Reach facility management and built environment professionals through sponsorship, advertising, and exhibition.",
        "sections": _sections(
            (
                "Opportunities",
                "",
                [
                    "Brand visibility at flagship forums and digital channels",
                    "Exhibition and showcase opportunities",
                    "Thought-leadership speaking placements",
                    "Alignment with sustainability and professional development themes",
                ],
            ),
            (
                "Packages",
                "Tell us your goals and audience—we will outline packages that fit your organization.",
                [],
            ),
        ),
        "cta_label": "Sponsor and Advertise",
        "cta_href": "/contact",
    },
    {
        "slug": "awards",
        "title": "Awards and Excellence",
        "description": "Recognizing outstanding individuals, organizations, and projects in facility and property management.",
        "lead": (
            "The Awards & Excellence Program recognizes outstanding individuals, organizations, and projects that "
            "demonstrate innovation, leadership, sustainability, and excellence in facility and property management."
        ),
        "sections": _sections(
            (
                "Award categories",
                "",
                [
                    "Facility Manager of the Year",
                    "Property Manager of the Year",
                    "Corporate Excellence in Facility Management",
                    "Sustainability & Green Building Leadership Award",
                    "Health, Safety & Risk Management Award",
                    "Outstanding FM Project of the Year",
                ],
            ),
            (
                "Nominations",
                (
                    "Interested in nominating an individual, organization, or project? Contact us to learn more about "
                    "award categories, eligibility criteria, nomination procedures, and sponsorship opportunities."
                ),
                [],
            ),
        ),
        "cta_label": "Contact Us",
        "cta_href": "/contact",
    },
]

EVENTS_INDEX = {
    "title": "Events",
    "menu_label": "Events",
    "description": "CAISBE forums, conferences, webinars, sponsorship, and awards programs.",
    "lead": "Connect through flagship forums, learning events, and recognition programs across Africa and Canada.",
    "sections": _sections(
        (
            "Explore events",
            "",
            [
                "Event Calendar",
                "Africa–Canada Built Environment Expo & Forum",
                "Conferences and Webinars",
                "Get Involved",
                "Sponsor and Advertise",
                "Awards and Excellence",
            ],
        ),
    ),
    "cta_label": "View calendar",
    "cta_href": "/events/calendar",
}

NETWORK_PAGES = [
    {
        "slug": "overview",
        "title": "Overview",
        "description": (
            "Our Networking Groups connect facility management professionals, students, industry partners, "
            "and organizations."
        ),
        "lead": "Connect with peers, students, and partners through CAISBE networking groups.",
        "sections": _sections(
            (
                "How networking works",
                (
                    "Through regular meetings, webinars, conferences, technical forums, and collaborative initiatives, "
                    "members gain insights into emerging trends, innovative technologies, workplace management, and leadership."
                ),
                [
                    "Peer learning across Africa and Canada",
                    "Access to forums, webinars, and technical discussions",
                    "Relationships that support career growth and partnerships",
                    "Shared practice on workplace, assets, and sustainability",
                ],
            ),
        ),
        "cta_label": "Join the Discussion Forum",
        "cta_href": "/network/discussion-forum",
    },
]

NETWORK_INDEX = {
    "title": "Network",
    "menu_label": "Network",
    "description": "Networking groups and the CAISBE discussion forum for members and students.",
    "lead": "Build professional relationships and join conversations that advance facility management practice.",
    "sections": _sections(
        (
            "Network options",
            "",
            ["Overview", "Discussion Forum"],
        ),
    ),
    "cta_label": "Overview",
    "cta_href": "/network/overview",
}

_OLD_NETWORK_LABEL = "Overview / Networking Groups"
_CORPORATE_PATH = "/professional-development/learning-formats/on-site-corporate-training"
_CORPORATE_NOTE = (
    "Our corporate programmes are fully tailored: both the content and the scheduling are shaped around "
    "your team's goals and operating context to ensure maximum relevance and minimal disruption."
)

LEARNING_FORMAT_PAGES = [
    {
        "slug": "online-self-paced",
        "title": "Online (Self-Paced)",
        "description": (
            "Learn anytime, anywhere at your own pace with 24/7 access to interactive digital materials—no fixed schedule."
        ),
        "lead": "Self-paced online learning designed for busy professionals.",
        "sections": _sections(
            (
                "What is included",
                "Modules include microlessons, video presentations, review quizzes, practice exams, and tools like flashcards.",
                [],
            ),
        ),
        "cta_label": "Register for a course",
        "cta_href": "/professional-development",
    },
    {
        "slug": "virtual-live-classes",
        "title": "Virtual Classes",
        "description": (
            "Live instructor-led sessions online—join from anywhere and interact in real time via video, chat, and shared tools."
        ),
        "lead": "Live online classes with real-time interaction.",
        "sections": _sections(
            (
                "How sessions work",
                "Sessions blend live teaching with self-paced study through discussions, case studies, and collaborative activities.",
                [],
            ),
        ),
        "cta_label": "Register for a course",
        "cta_href": "/professional-development",
    },
    {
        "slug": "in-person-classroom-training",
        "title": "In-Person Classroom Training",
        "description": "Face-to-face classroom learning with expert instructors, peer networking, and a focused environment.",
        "lead": "Classroom training with instructors and peer networking.",
        "sections": _sections(
            (
                "Locations",
                "Available in Addis Ababa, Nairobi, South Africa, Canada, and many other locations worldwide.",
                [],
            ),
        ),
        "cta_label": "Register for a course",
        "cta_href": "/professional-development",
    },
    {
        "slug": "on-site-corporate-training",
        "title": "On-Site Corporate Training",
        "description": _CORPORATE_NOTE,
        "lead": "Bring CAISBE training to your workplace.",
        "sections": [],
        "cta_label": "Contact us for details",
        "cta_href": "/contact",
    },
]

LEARNING_FORMATS_INDEX = {
    "title": "Learning Formats",
    "menu_label": "Learning Formats",
    "description": (
        "CAISBE delivers certificate programs through flexible learning formats designed for working professionals, "
        "students, and organizations."
    ),
    "lead": "Choose the learning format that fits your schedule, location, and goals.",
    "sections": _sections(
        (
            "Education options",
            "",
            [
                "Online (Self-Paced)",
                "Virtual Classes",
                "In-Person Classroom Training",
                "On-Site Corporate Training",
            ],
        ),
    ),
    "cta_label": "View certificate programs",
    "cta_href": "/professional-development",
}

STANDALONE_PAGES = [
    {
        "slug": "partners",
        "title": "Become a Partner",
        "menu_label": "Become a Partner",
        "description": (
            "Partner with CAISBE for group enrollment, dedicated support, and respected credentials across Africa and Canada."
        ),
        "lead": (
            "Our partnership program helps organizations build relationships, capture connections, and maximize their "
            "investment in facility and property management education."
        ),
        "sections": _sections(
            (
                "Benefits of Partnering",
                "",
                [
                    "Group enrollment that makes team training more cost-effective",
                    "Dedicated support from the CAISBE team",
                    "Market recognition as an official CAISBE partner",
                    "Respected credentials for employees, clients, or members",
                ],
            ),
            (
                "How it Works",
                "",
                [
                    "Submit an inquiry",
                    "We contact you to understand your objectives",
                    "We prepare a proposal shaped around your training goals",
                    "We start the partnership in property and facility management education",
                ],
            ),
        ),
        "cta_label": "Become a Partner",
        "cta_href": "mailto:info@caisbe.org?subject=Partnership%20inquiry",
        "show_in_menu": False,
    },
    {
        "slug": "projects",
        "title": "Projects & Initiatives",
        "description": (
            "Collaborative initiatives advancing sustainable facility management, capacity building, and Africa–Canada partnership."
        ),
        "lead": (
            "CAISBE projects connect professionals, institutions, and partners to strengthen practice, share knowledge, "
            "and support resilient built environments."
        ),
        "sections": _sections(
            (
                "Current initiatives",
                "",
                [
                    "Africa–Canada Knowledge Exchange",
                    "Professional Certification Pathways",
                    "Campus & Workplace Sustainability Labs",
                    "Chapter Capacity Building",
                    "Built Environment Policy Dialogue",
                    "Member Resource Digitization",
                ],
            ),
        ),
        "cta_label": "Contact Us",
        "cta_href": "/contact",
        "show_in_menu": False,
    },
    {
        "slug": "store",
        "title": "CAISBE Bookstore",
        "menu_label": "Store / Bookstore",
        "description": (
            "Publications, guides, and member materials that support facility management practice across Africa and Canada."
        ),
        "lead": (
            "The CAISBE bookstore curates professional reading for facility managers, property professionals, educators, "
            "and partners."
        ),
        "sections": _sections(
            (
                "Categories",
                "",
                ["Publications", "Practice Guides", "Member Materials"],
            ),
            (
                "How to order",
                "",
                [
                    "Browse featured titles and note the materials that fit your team or chapter",
                    "Contact CAISBE with the title names, quantity, and delivery location",
                    "Our team will confirm availability, pricing, and shipping or digital delivery options",
                ],
            ),
        ),
        "cta_label": "Contact to order",
        "cta_href": "/contact",
        "show_in_menu": False,
    },
    {
        "slug": "privacy-policy",
        "title": "Privacy Policy",
        "description": "Privacy policy for the Canada Africa Institute for the Sustainable Built Environment website.",
        "lead": "How CAISBE collects, uses, and protects personal information. Last updated: June 1, 2025.",
        "sections": _sections(
            (
                "Who We Are",
                (
                    "Canada Africa Institute for the Sustainable Built Environment (CAISBE) is an international knowledge, "
                    "training, and professional development institute headquartered at 815-4AVE SW, Calgary, Alberta T2P 5N7, Canada. "
                    "We are committed to respecting your privacy and protecting your personal information in accordance with PIPEDA "
                    "and applicable provincial privacy legislation."
                ),
                [],
            ),
            (
                "Information We Collect",
                "We may collect identity and contact data, account data, financial data processed by payment providers, "
                "enrollment and membership history, communications data, and technical analytics data.",
                [],
            ),
            (
                "How We Use Your Information",
                "",
                [
                    "Process enrollments, memberships, and payments",
                    "Send program updates and newsletters where permitted",
                    "Respond to enquiries and provide support",
                    "Meet legal and security obligations",
                    "Improve the website through anonymised analytics",
                ],
            ),
            (
                "Your Rights & Contact",
                (
                    "You may request access, correction, deletion subject to legal retention, or withdraw consent where "
                    "processing is based on consent. Contact info@caisbe.org, or the Office of the Privacy Commissioner of Canada."
                ),
                [],
            ),
        ),
        "cta_label": "Contact Us",
        "cta_href": "/contact",
        "show_in_menu": False,
    },
]

SPONSOR_PAGE = {
    "slug": "become-a-sponsor",
    "title": "Sponsor, Advertise, or Exhibit with CAISBE",
    "menu_label": "Become a Sponsor",
    "lead": (
        "Connect with Built environment community, professionals, educational institutions, and organizations shaping "
        "the future of the built environment in Canada and Africa. Partner with CAISBE to showcase your products and "
        "services, promote your brand, support professional education, and build valuable networks across the "
        "facilities management, real estate, construction, and sustainability sectors."
    ),
    "sections": [],
    "cta_label": "Become a Sponsor",
    "cta_href": "/contact",
}


def _faq_sections() -> list[Section]:
    faqs: list[tuple[str, list[str]]] = [
        (
            "Why Choose CAISBE?",
            [
                "Industry-recognized qualifications",
                "Corporate training",
                "Global industry partnerships",
                "A growing community of Sustainable Built Environment professionals, students, and employers",
            ],
        ),
        (
            "How long does the certificate program take?",
            ["Program duration varies by certificate and may take 8 weeks, with flexible pacing options."],
        ),
        (
            "Can I study CAISBE courses online or self-paced?",
            [
                "Yes. CAISBE offers online learning and weekend study options designed for working professionals across Canada and Africa."
            ],
        ),
        (
            "Can I take some courses in online self-paced and in classroom?",
            [
                "You can choose from any delivery method that is available to you. Once you select one method, you do not need to use this method for the remaining courses in the certificate programs. You can mix the delivery options depending on your budget, availability, and needs."
            ],
        ),
        (
            "Is there a time limit as to completion of the certificates?",
            [
                "Learners must complete their certificate enrolment within a three-year period. Learners selecting not to complete their certificate enrolment within the term will be considered inactive."
            ],
        ),
        (
            "How long are the certificate exams?",
            [
                "In the CAISBE Learning Portal, you will have two hours to complete your exams. You are required to read and comply with the CAISBE code of professional ethics, so please read those prior to taking your course exam."
            ],
        ),
        (
            "What is the pass mark?",
            [
                "To pass the exam you must score a 70% or better. If you fail, you cannot appeal to have your score changed to a pass."
            ],
        ),
        (
            "What type of questions are possibly asked on the exam?",
            [
                "Exams are multiple choice. Each chapter within your course material will have practice questions that can be used to prepare you for the type of questions that will appear on the certificate exam."
            ],
        ),
        (
            "When do I find out how I did on the exam?",
            [
                "Once you complete your last question of the exam, the system will indicate what your unofficial mark is. You will receive an official result within fourteen days after you complete the exam."
            ],
        ),
        (
            "What is the CAISBE continuing professional development program?",
            [
                "The CPD program requires that course graduates earn 16 points of continuing education credit every two years to maintain their membership certificate status. The two-year renewal period begins on the date that graduates attain their first certificate."
            ],
        ),
        (
            "How do I get my CPD points and certificates?",
            [
                "You can get your CPD points in a number of ways. You can attend conferences, seminars, and trade shows related to facility management or property management, including building operations."
            ],
        ),
        (
            "Which course should I take first?",
            [
                "You can take any course in any order. If you don’t have a background in facility operations, start with the Fundamentals course, as this course covers a bit of everything about facility operations and you will find it easier once you have taken the other courses."
            ],
        ),
        (
            "Is there a time limit as to when I must complete the certificate programs?",
            [
                "Learners must complete their certificate enrolment within a one-year period. Beyond this term, members will be considered inactive."
            ],
        ),
    ]
    return _sections(*((question, "", answers) for question, answers in faqs))


FRAME_PAGES = [
    {
        "slug": "careers",
        "title": "Careers & Job Opportunities",
        "menu_label": "Careers & Job Opportunities",
        "description": "Explore facility management jobs, internships, and career development resources published by CAISBE.",
        "lead": "Browse facility management roles published by CAISBE for professionals across Canada, Africa, and global markets.",
        "sections": [],
        "show_in_menu": False,
    },
    {
        "slug": "news",
        "title": "News & Announcements",
        "menu_label": "News & Announcements",
        "description": "Stay informed about institute initiatives, upcoming forums, membership milestones, and opportunities to get involved.",
        "lead": "Updates from CAISBE programs, events, partnerships, and the professional community across Africa and Canada.",
        "sections": _sections(
            (
                "Latest updates",
                "Announcements are listed newest first as published by the CAISBE team.",
                [],
            ),
        ),
        "cta_label": "Media Inquiries",
        "cta_href": "/contact",
        "show_in_menu": False,
    },
    {
        "slug": "help",
        "title": "Help and Support",
        "menu_label": "Help and Support",
        "description": "FAQs, technical support tickets, and requests for courses, certificates, your account, and problems to report.",
        "lead": "FAQs, technical tickets, and requests for courses, certificates, your account, and problems to report.",
        "sections": [],
        "show_in_menu": False,
    },
    {
        "parent_path": "/resources",
        "slug": "help-desk",
        "title": "CAISBE Help Desk",
        "menu_label": "CAISBE Help Desk",
        "description": "Search CAISBE FAQs for answers about courses, exams, membership, CPD, and enrollment.",
        "lead": "How can we help?",
        "sections": _faq_sections(),
        "cta_label": "Open a support ticket",
        "cta_href": "/resources/tickets",
    },
    {
        "parent_path": "/resources",
        "slug": "tickets",
        "title": "Tickets",
        "menu_label": "Tickets",
        "description": "Sign in to see your CAISBE support tickets or submit a new one.",
        "lead": "Sign in to see your support tickets or submit a new one.",
        "sections": [],
    },
    {
        "parent_path": "/resources",
        "slug": "media",
        "title": "Media",
        "menu_label": "Media",
        "description": "Stay connected with CAISBE through our magazine, video, podcast, and blog channels.",
        "lead": "Stay connected with CAISBE through our magazine, video, podcast, and blog channels.",
        "sections": [],
    },
    {
        "parent_path": "/resources",
        "slug": "magazine",
        "title": "CAISBE Magazine",
        "menu_label": "CAISBE Magazine",
        "description": "CAISBE Magazine features and updates for facility management professionals.",
        "lead": "Features and updates from practitioners shaping facility management across Africa and Canada.",
        "sections": _sections(("Latest issues", "", [])),
    },
    {
        "parent_path": "/resources",
        "slug": "youtube",
        "title": "YouTube",
        "menu_label": "YouTube",
        "description": "Watch CAISBE videos, event highlights, and educational content.",
        "lead": "Video sessions, event highlights, and short learning clips from CAISBE programs.",
        "sections": _sections(("Latest videos", "", [])),
    },
    {
        "parent_path": "/resources",
        "slug": "podcast",
        "title": "Podcast",
        "menu_label": "Podcast",
        "description": "Listen to conversations with leaders shaping facility management across Africa and Canada.",
        "lead": "Conversations with leaders on operations, sustainability, and Africa–Canada collaboration.",
        "sections": _sections(("Latest episodes", "", [])),
    },
    {
        "parent_path": "/resources",
        "slug": "blog",
        "title": "Blog",
        "menu_label": "Blog",
        "description": "Stay informed with articles and commentary on facility management and the built environment.",
        "lead": "Articles and commentary on facility management practice and the sustainable built environment.",
        "sections": _sections(("Latest posts", "", [])),
    },
    {
        "parent_path": "/resources",
        "slug": "advocacy-government-affairs",
        "title": "Advocacy and Government",
        "menu_label": "Advocacy and Government",
        "description": "CAISBE advocates for stronger Africa–Canada collaboration in Facility Management, sustainable buildings, and the built environment.",
        "lead": (
            "We advocate for stronger Africa–Canada collaboration in Facility Management, Property Management, "
            "Sustainable Buildings, and the Built Environment by promoting knowledge exchange, policy dialogue, and "
            "strategic partnerships between governments, industry, and professional organizations."
        ),
        "sections": _sections(
            (
                "Focus",
                (
                    "Our advocacy efforts focus on supporting green growth, climate-resilient infrastructure, energy "
                    "efficiency, circular economy practices, net-zero and low-carbon buildings, and sustainable asset "
                    "management across Africa. We work to connect African institutions with Canadian expertise, "
                    "innovation, technologies, and best practices in areas such as facility operations, smart buildings, "
                    "sustainable construction, and property lifecycle management."
                ),
                [],
            ),
            (
                "Stakeholders",
                (
                    "We engage with key stakeholders including the African Union, regional economic communities such as "
                    "COMESA, national governments, municipalities, professional associations, and relevant Canadian "
                    "federal and provincial organizations to advance policies and initiatives that strengthen capacity, "
                    "improve building performance, and support sustainable economic development."
                ),
                [],
            ),
            (
                "Our aim",
                (
                    "Through collaboration, research, policy advocacy, and knowledge transfer, we aim to support Africa’s "
                    "transition toward sustainable, efficient, and resilient built environments while creating "
                    "opportunities for investment, innovation, and long-term partnerships between Africa and Canada."
                ),
                [],
            ),
            (
                "Strategic consultancy",
                "We provide strategic consultancy services that strengthen Africa–Canada collaboration in and sustainable built environments. Our services include:",
                [],
            ),
            (
                "Policy Advisory & Consultation",
                "Supporting governments and institutions with sustainable building, asset management, and facility management strategies.",
                [],
            ),
            (
                "Knowledge Exchange & Partnerships",
                "Connecting African and Canadian organizations through expert networks, forums, and technical collaboration.",
                [],
            ),
            (
                "Green Growth & Sustainability Support",
                "Promoting energy efficiency, net-zero buildings, climate resilience, and sustainable infrastructure solutions.",
                [],
            ),
            (
                "Capacity Building & Training",
                "Developing skills and professional capacity for government agencies, organizations, and industry professionals.",
                [],
            ),
            (
                "How this helps",
                "Through these services, we support the development of resilient, efficient, and sustainable built environments across Africa by sharing global expertise and fostering long-term partnerships.",
                [],
            ),
        ),
        "cta_label": "Contact Us",
        "cta_href": "/contact",
    },
    {
        "parent_path": "/events",
        "slug": "calendar",
        "title": "Event Calendar",
        "menu_label": "Event Calendar",
        "description": "Explore upcoming CAISBE events, forums, conferences, and webinars connecting Africa and Canada across the built environment sector.",
        "lead": "A living view of forums, conferences, webinars, and chapter activities across the CAISBE calendar.",
        "sections": [],
    },
]


def _is_blank(page: SitePage) -> bool:
    return (
        not (page.description or "").strip()
        and not (page.lead or "").strip()
        and not (page.sections or [])
    )


def _apply_spec(page: SitePage, spec: dict, *, show_in_menu: bool) -> None:
    page.title = spec["title"]
    page.menu_label = (spec.get("menu_label") or spec["title"])[:120]
    page.description = spec.get("description") or ""
    page.lead = spec.get("lead") or ""
    page.sections = spec.get("sections") or []
    page.cta_label = spec.get("cta_label")
    page.cta_href = spec.get("cta_href")
    page.show_in_menu = show_in_menu
    page.status = "published"


def _anchor(db: Session, slug: str, spec: dict | None = None, *, title: str | None = None) -> SitePage:
    path = f"/{slug}"
    existing = db.query(SitePage).filter(SitePage.path == path).first()
    if existing:
        if spec and _is_blank(existing):
            _apply_spec(existing, spec, show_in_menu=False)
            db.flush()
        return existing
    page = SitePage(
        title=(spec or {}).get("title") or title or slug.title(),
        menu_label=((spec or {}).get("menu_label") or (spec or {}).get("title") or title or slug.title())[:120],
        slug=slug,
        path=path,
        description=(spec or {}).get("description") or "",
        lead=(spec or {}).get("lead") or "",
        sections=(spec or {}).get("sections") or [],
        cta_label=(spec or {}).get("cta_label"),
        cta_href=(spec or {}).get("cta_href"),
        sort_order=0,
        show_in_menu=False,
        status="published",
    )
    db.add(page)
    db.flush()
    return page


def _child(db: Session, parent: SitePage, spec: dict, sort_order: int, *, show_in_menu: bool = True) -> None:
    path = f"{parent.path.rstrip('/')}/{spec['slug']}"
    existing = db.query(SitePage).filter(SitePage.path == path).first()
    if existing:
        if _is_blank(existing):
            existing.parent_id = parent.id
            existing.slug = spec["slug"]
            existing.sort_order = sort_order
            _apply_spec(existing, spec, show_in_menu=show_in_menu)
            db.flush()
        return
    db.add(
        SitePage(
            parent_id=parent.id,
            title=spec["title"],
            menu_label=(spec.get("menu_label") or spec["title"])[:120],
            slug=spec["slug"],
            path=path,
            description=spec.get("description") or "",
            lead=spec.get("lead") or "",
            sections=spec.get("sections") or [],
            cta_label=spec.get("cta_label"),
            cta_href=spec.get("cta_href"),
            sort_order=sort_order,
            show_in_menu=show_in_menu,
            status="published",
        )
    )
    db.flush()


def _top_level(db: Session, spec: dict, sort_order: int) -> None:
    path = f"/{spec['slug']}"
    existing = db.query(SitePage).filter(SitePage.path == path).first()
    show_in_menu = bool(spec.get("show_in_menu", False))
    if existing:
        if _is_blank(existing):
            existing.slug = spec["slug"]
            existing.parent_id = None
            existing.sort_order = sort_order
            _apply_spec(existing, spec, show_in_menu=show_in_menu)
            db.flush()
        return
    db.add(
        SitePage(
            parent_id=None,
            title=spec["title"],
            menu_label=(spec.get("menu_label") or spec["title"])[:120],
            slug=spec["slug"],
            path=path,
            description=spec.get("description") or "",
            lead=spec.get("lead") or "",
            sections=spec.get("sections") or [],
            cta_label=spec.get("cta_label"),
            cta_href=spec.get("cta_href"),
            sort_order=sort_order,
            show_in_menu=show_in_menu,
            status="published",
        )
    )
    db.flush()


# Mistakenly added under Professional Development; keep Resources copies if present.
_MISTAKEN_PD_SLUGS = (
    "esg-facility-management",
    "crisis-resource-center",
    "leader-tools",
    "component-reports",
)


def _apply_editorial_updates(db: Session) -> None:
    """Refresh labels and corporate copy on pages that seed will not overwrite."""
    overview = db.query(SitePage).filter(SitePage.path == "/network/overview").first()
    if overview is not None:
        if overview.title == _OLD_NETWORK_LABEL:
            overview.title = "Overview"
        if overview.menu_label == _OLD_NETWORK_LABEL:
            overview.menu_label = "Overview"

    network = db.query(SitePage).filter(SitePage.path == "/network").first()
    if network is not None:
        if network.cta_label == "Networking Groups":
            network.cta_label = "Overview"
        sections = []
        changed = False
        for section in network.sections or []:
            items = list(section.get("items") or [])
            new_items = ["Overview" if item == _OLD_NETWORK_LABEL else item for item in items]
            if new_items != items:
                changed = True
                section = {**section, "items": new_items}
            sections.append(section)
        if changed:
            network.sections = sections

    board = db.query(SitePage).filter(SitePage.path == "/about/board-of-directors").first()
    if board is not None:
        leadership_title = "Connect with leadership"
        leadership_body = (
            "For board correspondence, nominations, or governance questions, contact the institute office."
        )
        next_sections = []
        found = False
        for section in board.sections or []:
            if (section.get("title") or "").strip().lower() == leadership_title.lower():
                found = True
                section = {**section, "title": leadership_title, "body": section.get("body") or leadership_body}
            next_sections.append(section)
        if not found:
            next_sections.append({"title": leadership_title, "body": leadership_body, "items": []})
        board.sections = next_sections

    programs = db.query(SitePage).filter(SitePage.path == "/professional-development").first()
    if (
        programs is not None
        and programs.title == "Professional Development"
        and programs.lead
        == "Certificate programs and flexible learning formats for working professionals, students, and organizations."
    ):
        programs.title = "Certificate Programs"
        programs.lead = (
            "Explore CAISBE certificate programs designed for facility management, property management, "
            "and built environment professionals."
        )
        programs.sections = _sections(
            (
                "Certificate courses",
                "Published CAISBE certificate programs for facility, property, and built-environment professionals.",
                [],
            ),
            (
                "Seminars",
                "Professional seminars that complement certificate pathways and support continuing development.",
                [],
            ),
            (
                "Learning Formats",
                (
                    "CAISBE delivers certificate programs through flexible learning formats designed for working "
                    "professionals, students, and organizations."
                ),
                [],
            ),
        )

    corporate = db.query(SitePage).filter(SitePage.path == _CORPORATE_PATH).first()
    if corporate is not None:
        corporate.description = _CORPORATE_NOTE
        corporate.sections = [
            section
            for section in (corporate.sections or [])
            if (section.get("title") or "").strip().lower() != "corporate delivery"
        ]
    db.flush()


def _remove_mistaken_professional_development_pages(db: Session) -> None:
    professional = db.query(SitePage).filter(SitePage.path == "/professional-development").first()
    if professional is not None:
        rows = (
            db.query(SitePage)
            .filter(
                SitePage.parent_id == professional.id,
                SitePage.slug.in_(_MISTAKEN_PD_SLUGS),
            )
            .all()
        )
        for row in rows:
            db.delete(row)
    for slug in _MISTAKEN_PD_SLUGS:
        path = f"/professional-development/{slug}"
        row = db.query(SitePage).filter(SitePage.path == path).first()
        if row is not None:
            db.delete(row)
    db.flush()


def seed_site_pages(db: Session) -> None:
    _remove_mistaken_professional_development_pages(db)

    about = _anchor(db, "about", ABOUT_INDEX)
    resources = _anchor(db, "resources", RESOURCES_INDEX)
    membership = _anchor(db, "membership", MEMBERSHIP_INDEX)
    events = _anchor(db, "events", EVENTS_INDEX)
    network = _anchor(db, "network", NETWORK_INDEX)
    professional = _anchor(
        db,
        "professional-development",
        {
            "title": "Certificate Programs",
            "menu_label": "Professional Development",
            "description": (
                "Explore CAISBE certificate programs designed for facility management, property management, "
                "and built environment professionals."
            ),
            "lead": (
                "Explore CAISBE certificate programs designed for facility management, property management, "
                "and built environment professionals."
            ),
            "sections": _sections(
                (
                    "Certificate courses",
                    "Published CAISBE certificate programs for facility, property, and built-environment professionals.",
                    [],
                ),
                (
                    "Seminars",
                    "Professional seminars that complement certificate pathways and support continuing development.",
                    [],
                ),
                (
                    "Learning Formats",
                    (
                        "CAISBE delivers certificate programs through flexible learning formats designed for working "
                        "professionals, students, and organizations."
                    ),
                    [],
                ),
            ),
            "cta_label": "Learning Formats",
            "cta_href": "/professional-development/learning-formats",
        },
    )
    learning_formats = None
    formats_path = "/professional-development/learning-formats"
    existing_formats = db.query(SitePage).filter(SitePage.path == formats_path).first()
    if existing_formats and not _is_blank(existing_formats):
        learning_formats = existing_formats
    else:
        _child(db, professional, {**LEARNING_FORMATS_INDEX, "slug": "learning-formats"}, 10, show_in_menu=False)
        learning_formats = db.query(SitePage).filter(SitePage.path == formats_path).one()

    for index, spec in enumerate(ABOUT_PAGES):
        _child(db, about, spec, (index + 1) * 10)
    for index, spec in enumerate(RESOURCE_PAGES):
        _child(db, resources, spec, (index + 1) * 10)
    for index, spec in enumerate(MEMBERSHIP_PAGES):
        _child(db, membership, spec, (index + 1) * 10)
    for index, spec in enumerate(EVENTS_PAGES):
        _child(db, events, spec, (index + 1) * 10)
    for index, spec in enumerate(NETWORK_PAGES):
        _child(db, network, spec, (index + 1) * 10)
    for index, spec in enumerate(LEARNING_FORMAT_PAGES):
        _child(db, learning_formats, spec, (index + 1) * 10)
    for index, spec in enumerate(STANDALONE_PAGES):
        _top_level(db, spec, (index + 1) * 10)

    partners_page = db.query(SitePage).filter(SitePage.path == "/partners").first()
    if partners_page is not None:
        _child(db, partners_page, SPONSOR_PAGE, 10)

    resources_page = db.query(SitePage).filter(SitePage.path == "/resources").first()
    events_page = db.query(SitePage).filter(SitePage.path == "/events").first()
    for index, spec in enumerate(FRAME_PAGES):
        parent_path = spec.get("parent_path")
        parent = resources_page if parent_path == "/resources" else events_page if parent_path == "/events" else None
        if parent_path and parent is not None:
            _child(db, parent, spec, (index + 1) * 10, show_in_menu=False)
        elif not parent_path:
            _top_level(db, spec, (index + 1) * 10)

    _apply_editorial_updates(db)
    _assign_paths(_pages(db))
    db.commit()
