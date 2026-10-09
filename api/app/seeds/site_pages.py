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
        "title": "Overview / Networking Groups",
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
            ["Overview / Networking Groups", "Discussion Forum"],
        ),
    ),
    "cta_label": "Networking Groups",
    "cta_href": "/network/overview",
}

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
        "description": (
            "Customized training at your company’s location—tailored content, flexible scheduling, and team-focused "
            "learning without travel."
        ),
        "lead": "Bring CAISBE training to your workplace.",
        "sections": _sections(
            (
                "Corporate delivery",
                "Content and scheduling are shaped around your team’s goals and operating context.",
                [],
            ),
        ),
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


def seed_site_pages(db: Session) -> None:
    about = _anchor(db, "about", ABOUT_INDEX)
    resources = _anchor(db, "resources", RESOURCES_INDEX)
    membership = _anchor(db, "membership", MEMBERSHIP_INDEX)
    events = _anchor(db, "events", EVENTS_INDEX)
    network = _anchor(db, "network", NETWORK_INDEX)
    professional = _anchor(
        db,
        "professional-development",
        {
            "title": "Professional Development",
            "menu_label": "Professional Development",
            "description": (
                "Explore CAISBE certificate programs designed for facility management, property management, "
                "and built environment professionals."
            ),
            "lead": "Certificate programs and flexible learning formats for working professionals, students, and organizations.",
            "sections": _sections(
                (
                    "Learning paths",
                    "",
                    ["Certificate Programs", "Learning Formats"],
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

    _assign_paths(_pages(db))
    db.commit()
