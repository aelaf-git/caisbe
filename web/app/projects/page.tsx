import type { Metadata } from "next";
import ProjectsPageContent from "@/components/projects/ProjectsPageContent";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

const fallbackDescription =
  "Explore CAISBE projects advancing sustainable facility management and Africa–Canada collaboration.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/projects", fallbackDescription)) ?? {
      title: "Projects & Initiatives | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default async function ProjectsPage() {
  return (await cmsTopicPage("/projects")) ?? <ProjectsPageContent />;
}
