import CertificatePreview from "@/components/certificates/CertificatePreview";

export default function CertificatesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-caisbe-text-dark">Certificates</h1>
        <p className="mt-2 max-w-2xl text-sm text-caisbe-muted">
          CAISBE issues two certificate types. Membership certificates are created when a student
          registers. Course completion certificates are issued when a student finishes a program
          (all lessons, or a passed final exam).
        </p>
      </div>

      <section className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Template previews</h2>
        <p className="text-sm text-caisbe-muted">
          Sample data is shown below. Layouts share the CAISBE frame but use different titles and
          fields so membership and completion stay distinct.
        </p>
        <CertificatePreview />
      </section>

      <section className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Dynamic fields</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-caisbe-text">Membership</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-caisbe-text">
              <li>Student name</li>
              <li>Membership number</li>
              <li>Member since date</li>
              <li>Verification QR code</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-caisbe-text">Course completion</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-caisbe-text">
              <li>Student name</li>
              <li>Course title</li>
              <li>Issue date</li>
              <li>Verification QR code</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
