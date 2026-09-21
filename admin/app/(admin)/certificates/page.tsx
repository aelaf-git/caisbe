import CertificatePreview from "@/components/certificates/CertificatePreview";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Credentials"
        title="Certificates"
        description="Preview the credentials issued automatically for membership and successful course completion."
      />

      <Card className="space-y-5">
        <div>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Template previews</h2>
        <p className="text-sm text-caisbe-muted">
          Sample data is shown below. Layouts share the CAISBE frame but use different titles and
          fields so membership and completion stay distinct.
        </p>
        </div>
        <CertificatePreview />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Dynamic fields</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-admin-surface-muted/60 p-4">
            <h3 className="text-sm font-semibold text-caisbe-text">Membership</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-caisbe-text">
              <li>Student name</li>
              <li>Membership number</li>
              <li>Member since date</li>
              <li>Verification QR code</li>
            </ul>
          </div>
          <div className="rounded-lg bg-admin-surface-muted/60 p-4">
            <h3 className="text-sm font-semibold text-caisbe-text">Course completion</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-caisbe-text">
              <li>Student name</li>
              <li>Course title</li>
              <li>Issue date</li>
              <li>Verification QR code</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
