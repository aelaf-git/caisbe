import type { Metadata } from "next";
import ProjectsPageContent from "@/components/projects/ProjectsPageContent";

export const metadata: Metadata = {
  title: "Projects & Initiatives | CAISBE",
  description:
    "Explore CAISBE projects advancing sustainable facility management and Africa–Canada collaboration.",
};

export default function ProjectsPage() {
  return <ProjectsPageContent />;
}
