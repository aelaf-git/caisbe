"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import AppearancePanel from "@/components/appearance/AppearancePanel";
import ProfileForm, { profileFromUser } from "@/components/portal/ProfileForm";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError } from "@/lib/auth";
import {
  formatDate,
  formatMoney,
  type InvoiceRow,
  type OrderRow,
  type SavedCard,
  type SecurityQuestion,
} from "@/lib/commerce";

const SEC_DEFAULT = [
  { question: "What city were you born in?", answer: "" },
  { question: "What is your mother's maiden name?", answer: "" },
];

export default function ManageProfilePage() {
  const { user, refreshUser } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [questions, setQuestions] = useState(SEC_DEFAULT);
  const [savedQuestions, setSavedQuestions] = useState<SecurityQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [cardForm, setCardForm] = useState({
    brand: "visa",
    last4: "",
    exp_month: "12",
    exp_year: String(new Date().getFullYear() + 2),
    first_name: "",
    last_name: "",
    cvv: "",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [invoiceData, orderData, cardData, questionData] = await Promise.all([
          apiFetch<InvoiceRow[]>("/me/invoices"),
          apiFetch<OrderRow[]>("/me/orders"),
          apiFetch<SavedCard[]>("/me/cards"),
          apiFetch<SecurityQuestion[]>("/auth/me/security-questions"),
        ]);
        if (!active) return;
        setInvoices(invoiceData);
        setOrders(orderData);
        setCards(cardData);
        setSavedQuestions(questionData);
        if (questionData.length >= 2) {
          setQuestions(questionData.slice(0, 2).map((item) => ({ question: item.question, answer: "" })));
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load account.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      await apiFetch("/auth/me/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.detail : "Unable to change password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function saveQuestions(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const data = await apiFetch<SecurityQuestion[]>("/auth/me/security-questions", {
        method: "PUT",
        body: JSON.stringify({ questions }),
      });
      setSavedQuestions(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save security questions.");
    }
  }

  async function saveCard(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const { cvv: _cvv, ...payload } = cardForm;
      const card = await apiFetch<SavedCard>("/me/cards", {
        method: "POST",
        body: JSON.stringify({
          brand: payload.brand,
          last4: payload.last4,
          exp_month: Number(payload.exp_month),
          exp_year: Number(payload.exp_year),
          first_name: payload.first_name,
          last_name: payload.last_name,
        }),
      });
      setCards((current) => [card, ...current]);
      setCardForm((current) => ({ ...current, last4: "", cvv: "" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save card.");
    }
  }

  const inputClass =
    "mt-1 h-11 w-full rounded-md border border-ifma-border bg-admin-surface px-3 text-sm outline-none focus:border-caisbe-red";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Manage your profile"
        description="Password, billing history, security questions, saved cards, and appearance."
      />
      {error ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">{error}</div>
      ) : null}

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Profile details</h2>
        <p className="mt-1 mb-4 text-sm text-caisbe-muted">Same fields used for JOIN CAISBE membership applications.</p>
        <ProfileForm initial={profileFromUser(user)} onSaved={() => void refreshUser()} />
      </Card>

      <Card>
        <AppearancePanel />
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Change my password</h2>
        {passwordError ? <p className="mt-2 text-sm text-caisbe-red">{passwordError}</p> : null}
        {passwordMessage ? <p className="mt-2 text-sm text-caisbe-text">{passwordMessage}</p> : null}
        <form onSubmit={(e) => void handlePassword(e)} className="mt-4 max-w-md space-y-4">
          <label className="block text-sm">Current password<input type="password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
          <label className="block text-sm">New password<input type="password" minLength={8} className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
          <label className="block text-sm">Confirm new password<input type="password" minLength={8} className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
          <button type="submit" disabled={passwordBusy} className="h-11 rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60">
            {passwordBusy ? "Updating…" : "Change password"}
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">My invoices</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-admin-surface-muted/60"><tr className="text-caisbe-muted"><th className="px-3 py-2 pr-4">Invoice #</th><th className="px-3 py-2 pr-4">Bill date</th><th className="px-3 py-2 pr-4">Billing period</th><th className="px-3 py-2 pr-4">Amount paid</th><th className="px-3 py-2">Balance</th></tr></thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td className="px-3 py-3 text-caisbe-muted" colSpan={5}>No invoices yet.</td></tr>
              ) : invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-ifma-border-light">
                  <td className="px-3 py-3 pr-4 font-mono">{invoice.number}</td>
                  <td className="px-3 py-3 pr-4">{formatDate(invoice.bill_date)}</td>
                  <td className="px-3 py-3 pr-4">{formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}</td>
                  <td className="px-3 py-3 pr-4">{formatMoney(invoice.amount_paid_cents)}</td>
                  <td className="px-3 py-3">{formatMoney(invoice.balance_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">My orders</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-admin-surface-muted/60"><tr className="text-caisbe-muted"><th className="px-3 py-2 pr-4">Order name</th><th className="px-3 py-2 pr-4">Order date</th><th className="px-3 py-2 pr-4">Order total</th><th className="px-3 py-2 pr-4">Amount paid</th><th className="px-3 py-2">Balance</th></tr></thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td className="px-3 py-3 text-caisbe-muted" colSpan={5}>No orders yet.</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="border-t border-ifma-border-light">
                  <td className="px-3 py-3 pr-4">{order.name} <span className="font-mono text-xs text-caisbe-muted">{order.number}</span></td>
                  <td className="px-3 py-3 pr-4">{formatDate(order.created_at)}</td>
                  <td className="px-3 py-3 pr-4">{formatMoney(order.total_cents, order.currency)}</td>
                  <td className="px-3 py-3 pr-4">{formatMoney(order.amount_paid_cents, order.currency)}</td>
                  <td className="px-3 py-3">{formatMoney(order.balance_cents, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Security questions</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          {savedQuestions.length >= 2 ? "Questions are on file. Re-enter answers to replace them." : "Save two questions for account recovery."}
        </p>
        <form onSubmit={(e) => void saveQuestions(e)} className="mt-4 space-y-4">
          {questions.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">Question {index + 1}<input className={inputClass} value={item.question} onChange={(e) => setQuestions((current) => current.map((row, i) => i === index ? { ...row, question: e.target.value } : row))} required /></label>
              <label className="block text-sm">Answer<input className={inputClass} value={item.answer} onChange={(e) => setQuestions((current) => current.map((row, i) => i === index ? { ...row, answer: e.target.value } : row))} required /></label>
            </div>
          ))}
          <button type="submit" className="h-11 rounded-md border-2 border-ifma-border px-5 text-sm font-semibold uppercase tracking-wide text-caisbe-text">Save questions</button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Manage my card</h2>
        <p className="mt-1 text-sm text-caisbe-muted">Accepted cards: Visa and Mastercard. CVV is used only in this form and is never stored.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {cards.map((card) => (
            <li key={card.id} className="flex justify-between border border-ifma-border-light bg-admin-surface-muted/40 px-3 py-2">
              <span className="capitalize">{card.brand} •••• {card.last4}</span>
              <span>{card.exp_month}/{card.exp_year} · {card.first_name} {card.last_name}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => void saveCard(e)} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">Accepted cards
            <select className={inputClass} value={cardForm.brand} onChange={(e) => setCardForm({ ...cardForm, brand: e.target.value })}>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
            </select>
          </label>
          <label className="block text-sm">Credit card # (last 4)<input className={inputClass} maxLength={4} value={cardForm.last4} onChange={(e) => setCardForm({ ...cardForm, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} required /></label>
          <label className="block text-sm">Exp month<input className={inputClass} value={cardForm.exp_month} onChange={(e) => setCardForm({ ...cardForm, exp_month: e.target.value })} required /></label>
          <label className="block text-sm">Exp year<input className={inputClass} value={cardForm.exp_year} onChange={(e) => setCardForm({ ...cardForm, exp_year: e.target.value })} required /></label>
          <label className="block text-sm">CVV2<input className={inputClass} maxLength={4} value={cardForm.cvv} onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} required /></label>
          <label className="block text-sm">First name<input className={inputClass} value={cardForm.first_name} onChange={(e) => setCardForm({ ...cardForm, first_name: e.target.value })} required /></label>
          <label className="block text-sm">Last name<input className={inputClass} value={cardForm.last_name} onChange={(e) => setCardForm({ ...cardForm, last_name: e.target.value })} required /></label>
          <div className="md:col-span-2">
            <button type="submit" className="h-11 rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white">Save card</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
