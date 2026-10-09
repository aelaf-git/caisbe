"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fieldClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";

type CourseFee = {
  id: number;
  code: string;
  title: string;
  status: string;
  currency: string;
  price_cents: number;
  exam_fee_cents: number;
  retake_fee_cents: number;
};

type Promo = {
  id: number;
  code: string;
  description: string;
  kind: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  complimentary: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  course_id: number | null;
  active: boolean;
};

type Outstanding = {
  order_id: number;
  order_number: string;
  student_name: string;
  student_email: string;
  description: string;
  item_kind: string;
  amount_due_cents: number;
  currency: string;
  created_at: string;
};

type Overview = {
  courses: CourseFee[];
  promotions: Promo[];
  outstanding: Outstanding[];
};

type FeeDraft = {
  price: string;
  exam: string;
  retake: string;
};

const emptyPromo = {
  kind: "discount",
  code: "",
  description: "",
  percent_off: "10",
  complimentary: false,
  course_id: "",
  expires_at: "",
  max_redemptions: "",
  active: true,
};

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function toCents(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function kindLabel(kind: string) {
  if (kind === "exam") return "Exam";
  if (kind === "retake") return "Retake";
  if (kind === "membership") return "Membership";
  if (kind === "scholarship") return "Scholarship";
  return "Course";
}

export default function FeesPage() {
  const { notice, dialog } = useNoticeDialog();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [drafts, setDrafts] = useState<Record<number, FeeDraft>>({});
  const [form, setForm] = useState(emptyPromo);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  function applyOverview(data: Overview) {
    setOverview(data);
    setDrafts(
      Object.fromEntries(
        data.courses.map((course) => [
          course.id,
          {
            price: dollars(course.price_cents),
            exam: dollars(course.exam_fee_cents),
            retake: dollars(course.retake_fee_cents),
          },
        ]),
      ),
    );
  }

  async function load() {
    const data = await apiFetch<Overview>("/admin/fees");
    applyOverview(data);
  }

  useEffect(() => {
    void load().catch((err) =>
      setLoadError(err instanceof ApiError ? err.detail : "Unable to load payment and fees."),
    );
  }, []);

  function updateDraft(id: number, patch: Partial<FeeDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { price: "0.00", exam: "0.00", retake: "0.00" }), ...patch },
    }));
  }

  async function saveFees(course: CourseFee, fields: Array<"price_cents" | "exam_fee_cents" | "retake_fee_cents">) {
    const draft = drafts[course.id];
    if (!draft) return;
    const body: Record<string, number> = {};
    if (fields.includes("price_cents")) {
      const cents = toCents(draft.price);
      if (cents == null) {
        await notice({ tone: "error", title: "Check the amount", description: "Enter a price of zero or more." });
        return;
      }
      body.price_cents = cents;
    }
    if (fields.includes("exam_fee_cents") || fields.includes("retake_fee_cents")) {
      const exam = toCents(draft.exam);
      const retake = toCents(draft.retake);
      if (exam == null || retake == null) {
        await notice({ tone: "error", title: "Check the amount", description: "Enter fees of zero or more." });
        return;
      }
      if (fields.includes("exam_fee_cents")) body.exam_fee_cents = exam;
      if (fields.includes("retake_fee_cents")) body.retake_fee_cents = retake;
    }
    setSavingId(course.id);
    try {
      await apiFetch(`/admin/fees/courses/${course.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
      await notice({ tone: "success", title: "Saved", description: `${course.code} fees updated.` });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: err instanceof ApiError ? err.detail : "Unable to save fees.",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function createPromo(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch("/admin/promotions", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          description: form.description,
          kind: form.kind,
          percent_off: form.complimentary ? null : Number(form.percent_off) || null,
          complimentary: form.complimentary,
          course_id: form.course_id ? Number(form.course_id) : null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
          active: form.active,
        }),
      });
      setForm(emptyPromo);
      await load();
      await notice({ tone: "success", title: "Done", description: "Code created." });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: err instanceof ApiError ? err.detail : "Unable to create the code.",
      });
    }
  }

  const courses = overview?.courses ?? [];

  return (
    <div className="space-y-8">
      {dialog}
      <PageHeader
        eyebrow="Commerce"
        title="Payment & Fees"
        description="Set course prices, exam and retake fees, and discount or scholarship codes. Unpaid balances stay here until they are paid."
      />
      {loadError ? <Alert tone="error">{loadError}</Alert> : null}

      <section id="pricing" className="scroll-mt-24 space-y-3">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Fees & Pricing</h2>
        <Card padding="none" className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{course.title}</p>
                    <p className="text-xs text-caisbe-muted">{course.code}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{course.status}</td>
                  <td className="px-4 py-3">
                    <input
                      className={`${fieldClassName} w-32`}
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${course.code} price`}
                      value={drafts[course.id]?.price ?? dollars(course.price_cents)}
                      onChange={(event) => updateDraft(course.id, { price: event.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingId === course.id}
                      onClick={() => void saveFees(course, ["price_cents"])}
                    >
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-caisbe-muted" colSpan={4}>
                    No courses yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>

      <section id="exam-fees" className="scroll-mt-24 space-y-3">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Exam & Retake Fees</h2>
        <p className="max-w-3xl text-sm text-caisbe-muted">
          A fee of zero keeps the exam included with the course and later attempts free. A fee above zero must be paid
          before that attempt.
        </p>
        <Card padding="none" className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Exam fee</th>
                <th className="px-4 py-3">Retake fee</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{course.title}</p>
                    <p className="text-xs text-caisbe-muted">{course.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className={`${fieldClassName} w-32`}
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${course.code} exam fee`}
                      value={drafts[course.id]?.exam ?? dollars(course.exam_fee_cents)}
                      onChange={(event) => updateDraft(course.id, { exam: event.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className={`${fieldClassName} w-32`}
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${course.code} retake fee`}
                      value={drafts[course.id]?.retake ?? dollars(course.retake_fee_cents)}
                      onChange={(event) => updateDraft(course.id, { retake: event.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingId === course.id}
                      onClick={() => void saveFees(course, ["exam_fee_cents", "retake_fee_cents"])}
                    >
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section id="discounts" className="scroll-mt-24 space-y-3">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Discounts & Scholarships</h2>
        <Card>
          <form onSubmit={(event) => void createPromo(event)} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Kind</span>
              <select
                className={fieldClassName}
                value={form.kind}
                onChange={(event) => setForm({ ...form, kind: event.target.value })}
              >
                <option value="discount">Discount</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Code</span>
              <input
                className={fieldClassName}
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                required
                minLength={3}
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium">Description</span>
              <input
                className={fieldClassName}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Percent off</span>
              <input
                className={fieldClassName}
                type="number"
                min={1}
                max={100}
                value={form.percent_off}
                disabled={form.complimentary}
                onChange={(event) => setForm({ ...form, percent_off: event.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Course</span>
              <select
                className={fieldClassName}
                value={form.course_id}
                onChange={(event) => setForm({ ...form, course_id: event.target.value })}
              >
                <option value="">Any course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Expires</span>
              <input
                className={fieldClassName}
                type="datetime-local"
                value={form.expires_at}
                onChange={(event) => setForm({ ...form, expires_at: event.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Max redemptions</span>
              <input
                className={fieldClassName}
                type="number"
                min={1}
                value={form.max_redemptions}
                onChange={(event) => setForm({ ...form, max_redemptions: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.complimentary}
                onChange={(event) => setForm({ ...form, complimentary: event.target.checked })}
              />
              Complimentary
            </label>
            <div>
              <Button type="submit">Create code</Button>
            </div>
          </form>
        </Card>
        <Card padding="none" className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {(overview?.promotions ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono font-semibold">{row.code}</td>
                  <td className="px-4 py-3">{kindLabel(row.kind)}</td>
                  <td className="px-4 py-3">
                    {row.complimentary ? "Complimentary" : `${row.percent_off ?? 0}%`}
                  </td>
                  <td className="px-4 py-3">
                    {row.redemption_count}
                    {row.max_redemptions ? ` / ${row.max_redemptions}` : ""}
                  </td>
                  <td className="px-4 py-3">{row.active ? "Active" : "Off"}</td>
                </tr>
              ))}
              {(overview?.promotions ?? []).length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-caisbe-muted" colSpan={5}>
                    No codes yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>

      <section id="outstanding" className="scroll-mt-24 space-y-3">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Outstanding Payments</h2>
        <Card padding="none" className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-admin-surface-muted/70">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">For</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Amount due</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {(overview?.outstanding ?? []).map((row) => (
                <tr key={row.order_id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.student_name}</p>
                    <p className="text-xs text-caisbe-muted">{row.student_email}</p>
                  </td>
                  <td className="px-4 py-3">{row.description}</td>
                  <td className="px-4 py-3">{kindLabel(row.item_kind)}</td>
                  <td className="px-4 py-3">{money(row.amount_due_cents, row.currency)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(overview?.outstanding ?? []).length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-caisbe-muted" colSpan={5}>
                    No unpaid balances.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
