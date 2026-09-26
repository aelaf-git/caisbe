"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import Button from "@/components/ui/Button";

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
};

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<PaymentRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<PaymentRow>(`/admin/payments/${params.id}`)
      .then(setRow)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Unable to load receipt."));
  }, [params.id]);

  async function markPrinted() {
    const updated = await apiFetch<PaymentRow>(`/admin/payments/${params.id}/print`, { method: "POST" });
    setRow(updated);
    window.print();
  }

  if (error) return <p className="text-sm text-caisbe-red">{error}</p>;
  if (!row) return <p className="text-sm text-caisbe-muted">Loading receipt…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-8 print:max-w-none">
      <div className="flex justify-between print:hidden">
        <Button onClick={() => void markPrinted()}>Print receipt</Button>
      </div>
      <h1 className="font-display text-3xl font-semibold">CAISBE Receipt</h1>
      <p className="text-sm text-caisbe-muted">Order {row.order_number}</p>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between"><dt>Student</dt><dd>{row.student_name}</dd></div>
        <div className="flex justify-between"><dt>Email</dt><dd>{row.student_email}</dd></div>
        <div className="flex justify-between"><dt>Course</dt><dd>{row.course_title}</dd></div>
        <div className="flex justify-between"><dt>Amount</dt><dd>${(row.amount_cents / 100).toFixed(2)}</dd></div>
        <div className="flex justify-between"><dt>Status</dt><dd className="capitalize">{row.status}</dd></div>
        <div className="flex justify-between"><dt>Method</dt><dd className="capitalize">{row.provider}</dd></div>
        <div className="flex justify-between"><dt>Date</dt><dd>{new Date(row.created_at).toLocaleString()}</dd></div>
      </dl>
    </div>
  );
}
