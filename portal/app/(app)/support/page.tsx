import HelpSupportCenter from "@/components/portal/HelpSupportCenter";
import PageHeader from "@/components/ui/PageHeader";

export default function HelpSupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Help and Support"
        description="FAQs, technical tickets, and requests for courses, certificates, your account, and problems to report."
      />
      <HelpSupportCenter />
    </div>
  );
}
