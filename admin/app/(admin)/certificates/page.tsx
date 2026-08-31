import CertificatePreview from "@/components/certificates/CertificatePreview";

export default function CertificatesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-caisbe-text-dark">Certificates</h1>
        <p className="mt-2 max-w-2xl text-sm text-caisbe-muted">
          All courses share one standard certificate layout. Certificates are issued automatically when
          a student completes every lesson (courses without a final exam) or passes the final exam.
        </p>
      </div>

      <section className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Template preview</h2>
        <p className="text-sm text-caisbe-muted">
          Sample data is shown below. On each issued certificate only the student name, course title,
          issue date, and QR code change.
        </p>
        <CertificatePreview />
      </section>

      <section className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Dynamic fields</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-caisbe-text">
          <li>Student name</li>
          <li>Course title</li>
          <li>Issue date</li>
          <li>Verification QR code (links to the public verify page)</li>
        </ul>
        <p className="text-sm text-caisbe-muted">
          Issued by: <span className="font-medium text-caisbe-text">CAISBE</span>
        </p>
      </section>
    </div>
  );
}
