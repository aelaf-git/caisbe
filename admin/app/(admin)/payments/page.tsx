"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

type PaymentRow = {
  id: number;
  status: string;
  provider: string;
  amount_cents: number;
  created_at: string;
  order_number: string;
  student_name: string;
  student_email: string;
  course_title: string;
  receipt_printed_at: string | null;
  reviewed_at: string | null;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiFetch<PaymentRow[]>("/admin/payments"));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function refund(id: number) {
    setBusyId(id);
    try {
      await apiFetch(`/admin/payments/${id}/refund`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to refund.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Commerce" title="Payments" description="Review Stripe and complimentary enrollments, print receipts, and refund." />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-4"><EmptyState title="No payments yet" description="Student checkouts will appear here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-admin-surface-muted/70">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ifma-border-light">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.student_name}</p>
                      <p className="text-xs text-caisbe-muted">{row.student_email} · {row.order_number}</p>
                    </td>
                    <td className="px-4 py-3">{row.course_title}</td>
                    <td className="px-4 py-3">{money(row.amount_cents)} · {row.provider}</td>
                    <td className="px-4 py-3 capitalize">{row.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/payments/${row.id}/receipt`} className="text-sm font-semibold text-caisbe-red">
                          Print receipt
                        </Link>
                        {row.status === "succeeded" || row.status === "pending" ? (
                          <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => void refund(row.id)}>
                            Refund
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
