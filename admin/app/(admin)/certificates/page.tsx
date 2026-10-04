"use client";

import { useCallback, useEffect, useState } from "react";
import CertificatePreview from "@/components/certificates/CertificatePreview";
import MembershipCertificateTypesManager from "@/components/certificates/MembershipCertificateTypesManager";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch, ApiError, type MembershipCertificateType } from "@/lib/auth";

export default function CertificatesPage() {
  const [items, setItems] = useState<MembershipCertificateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notice, dialog: noticeDialog } = useNoticeDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<MembershipCertificateType[]>("/admin/membership-certificate-types"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load membership certificates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Credentials"
        title="Certificates"
        description="Each membership type has its own certificate. Set the title, wording, and price here."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Membership certificates by type
          </h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Student, Professional, Corporate, Senior / Fellow, and Institutional each have a
            dedicated certificate and price.
          </p>
        </div>
        <MembershipCertificateTypesManager
          items={items}
          loading={loading}
          onRefresh={load}
          onError={(message) => {
            void notice({ tone: "error", title: "Something went wrong", description: message });
          }}
          onSuccess={(message) => {
            void notice({ tone: "success", title: "Done", description: message });
          }}
        />
      </Card>

      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Course completion preview
          </h2>
          <p className="text-sm text-caisbe-muted">
            Course certificates stay separate from membership credentials.
          </p>
        </div>
        <CertificatePreview kind="completion" />
      </Card>
      {noticeDialog}
    </div>
  );
}
