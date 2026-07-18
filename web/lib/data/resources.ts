export const advocacyContent = {
  slug: "advocacy-government-affairs",
  title: "Advocacy and Government",
  seoTitle: "Advocacy and Government | CAISBE",
  metaDescription:
    "CAISBE advocates for stronger Africa–Canada collaboration in Facility Management, sustainable buildings, and the built environment.",
  paragraphs: [
    "We advocate for stronger Africa–Canada collaboration in Facility Management, Property Management, Sustainable Buildings, and the Built Environment by promoting knowledge exchange, policy dialogue, and strategic partnerships between governments, industry, and professional organizations.",
    "Our advocacy efforts focus on supporting green growth, climate-resilient infrastructure, energy efficiency, circular economy practices, net-zero and low-carbon buildings, and sustainable asset management across Africa. We work to connect African institutions with Canadian expertise, innovation, technologies, and best practices in areas such as facility operations, smart buildings, sustainable construction, and property lifecycle management.",
    "We engage with key stakeholders including the African Union, regional economic communities such as COMESA, national governments, municipalities, professional associations, and relevant Canadian federal and provincial organizations to advance policies and initiatives that strengthen capacity, improve building performance, and support sustainable economic development.",
    "Through collaboration, research, policy advocacy, and knowledge transfer, we aim to support Africa’s transition toward sustainable, efficient, and resilient built environments while creating opportunities for investment, innovation, and long-term partnerships between Africa and Canada.",
  ],
  servicesIntro:
    "We provide strategic consultancy services that strengthen Africa–Canada collaboration in and sustainable built environments. Our services include:",
  services: [
    {
      title: "Policy Advisory & Consultation",
      description:
        "Supporting governments and institutions with sustainable building, asset management, and facility management strategies.",
    },
    {
      title: "Knowledge Exchange & Partnerships",
      description:
        "Connecting African and Canadian organizations through expert networks, forums, and technical collaboration.",
    },
    {
      title: "Green Growth & Sustainability Support",
      description:
        "Promoting energy efficiency, net-zero buildings, climate resilience, and sustainable infrastructure solutions.",
    },
    {
      title: "Capacity Building & Training",
      description:
        "Developing skills and professional capacity for government agencies, organizations, and industry professionals.",
    },
  ],
  closing:
    "Through these services, we support the development of resilient, efficient, and sustainable built environments across Africa by sharing global expertise and fostering long-term partnerships.",
};

export const membersCornerContent = {
  title: "Members Corner",
  description:
    "Stay connected with CAISBE through our magazine, video, podcast, and blog channels.",
  items: [
    {
      slug: "magazine",
      title: "CAISBE Magazine",
      description:
        "Read features, insights, and updates from across the CAISBE professional community.",
    },
    {
      slug: "youtube",
      title: "YouTube",
      description:
        "Watch CAISBE videos, event highlights, and educational content.",
    },
    {
      slug: "podcast",
      title: "Podcast",
      description:
        "Listen to conversations with leaders shaping facility management across Africa and Canada.",
    },
    {
      slug: "blog",
      title: "Blog",
      description:
        "Stay informed with articles and commentary on facility management and the built environment.",
    },
  ],
};

export const membersCornerSlugs = membersCornerContent.items.map(
  (item) => item.slug,
);

export function getMembersCornerItem(slug: string) {
  return membersCornerContent.items.find((item) => item.slug === slug);
}
