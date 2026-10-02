"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fieldClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";

type Promo = {
  id: number;
  code: string;
  description: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  complimentary: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  active: boolean;
};

const empty = {
  code: "",
  description: "",
  percent_off: "10",
  complimentary: false,
  max_redemptions: "",
  active: true,
};

export default function PromotionsPage() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRows(await apiFetch<Promo[]>("/admin/promotions"));
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof ApiError ? err.detail : "Unable to load promotions."));
  }, []);

  async function createPromo(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/admin/promotions", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          description: form.description,
          percent_off: form.complimentary ? 100 : Number(form.percent_off) || null,
          complimentary: form.complimentary,
          max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
          active: form.active,
        }),
      });
      setForm(empty);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to create promotion.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Commerce" title="Promotions" description="Legacy local discount codes (reference only). Paid student checkout uses Stripe promotion codes entered on the Stripe payment page." />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <h2 className="font-display text-lg font-semibold">New code</h2>
        <form onSubmit={(e) => void createPromo(e)} className="mt-4 grid gap-3 md:grid-cols-2">
          <input className={fieldClassName} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
          <input className={fieldClassName} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={fieldClassName} type="number" min={1} max={100} placeholder="Percent off" value={form.percent_off} onChange={(e) => setForm({ ...form, percent_off: e.target.value })} />
          <input className={fieldClassName} type="number" min={1} placeholder="Max redemptions (optional)" value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.complimentary} onChange={(e) => setForm({ ...form, complimentary: e.target.checked })} /> Complimentary (100% off)</label>
          <Button type="submit">Create promotion</Button>
        </form>
      </Card>
      <Card padding="none">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-admin-surface-muted/70">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ifma-border-light">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono font-semibold">{row.code}</td>
                <td className="px-4 py-3">{row.complimentary ? "Complimentary" : `${row.percent_off ?? 0}%`}</td>
                <td className="px-4 py-3">{row.redemption_count}{row.max_redemptions ? ` / ${row.max_redemptions}` : ""}</td>
                <td className="px-4 py-3">{row.active ? "Active" : "Off"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
