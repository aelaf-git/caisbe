import UnderConstruction from "@/components/pages/UnderConstruction";
import { slugToTitle } from "@/lib/routes";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const title = slugToTitle(slug);
  return {
    title: `${title} | CAISBE`,
  };
}

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const title = slugToTitle(slug);

  return <UnderConstruction title={title} />;
}
