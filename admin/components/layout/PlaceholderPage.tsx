import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Learning tools" title={title} description={description} />
      <Card padding="sm">
        <EmptyState
          title={`${title} are coming soon`}
          description="This workspace is not available yet. You can continue building and publishing courses in the meantime."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/dashboard" className={buttonStyles({ variant: "secondary" })}>Dashboard</Link>
              <Link href="/courses" className={buttonStyles()}>All courses</Link>
            </div>
          }
        />
      </Card>
    </div>
  );
}
