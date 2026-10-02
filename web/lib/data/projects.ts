export type ProjectStatus = "Active" | "Planning" | "Completed";

export type ProjectItem = {
  title: string;
  region: string;
  summary: string;
  status: ProjectStatus;
};

export const projectsContent = {
  eyebrow: "Programs",
  title: "Projects & Initiatives",
  lead:
    "Collaborative initiatives advancing sustainable facility management, capacity building, and Africa–Canada partnership.",
  intro:
    "CAISBE projects connect professionals, institutions, and partners to strengthen practice, share knowledge, and support resilient built environments.",
  items: [
    {
      title: "Africa–Canada Knowledge Exchange",
      region: "Africa & Canada",
      summary:
        "Structured forums, webinars, and peer exchanges that transfer FM and sustainability practices between regions.",
      status: "Active",
    },
    {
      title: "Professional Certification Pathways",
      region: "Multi-country",
      summary:
        "Curriculum and delivery partnerships that help practitioners earn recognized facility and property credentials.",
      status: "Active",
    },
    {
      title: "Campus & Workplace Sustainability Labs",
      region: "Canada / East Africa",
      summary:
        "Pilot collaborations with institutions to improve energy performance, operations, and occupant experience.",
      status: "Planning",
    },
    {
      title: "Chapter Capacity Building",
      region: "Africa",
      summary:
        "Tools, training, and mentoring for volunteer leaders building strong local professional communities.",
      status: "Active",
    },
    {
      title: "Built Environment Policy Dialogue",
      region: "Pan-African / Canada",
      summary:
        "Engagement with public-sector and industry stakeholders on standards, green growth, and asset stewardship.",
      status: "Planning",
    },
    {
      title: "Member Resource Digitization",
      region: "Institute-wide",
      summary:
        "Cataloguing guides, reports, and learning materials for easier member access through the CAISBE library.",
      status: "Completed",
    },
  ] satisfies ProjectItem[],
};
