export const MEMBERSHIP_TYPES = [
  { id: "student", label: "Student Membership" },
  { id: "professional", label: "Professional Membership" },
  { id: "corporate", label: "Corporate Membership" },
  { id: "senior-fellow", label: "Senior Member / Fellow" },
  { id: "institutional", label: "Institutional Member" },
] as const;

export const STRIPE_PROMO_HINT =
  "Have a discount code? Enter it on the Stripe payment page.";

export function membershipTypeLabel(value?: string | null) {
  if (!value) return "Not set";
  return MEMBERSHIP_TYPES.find((item) => item.id === value)?.label ?? value;
}

export function formatMoney(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export type CartItem = {
  id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  cover_url: string | null;
  price_cents: number;
  currency: string;
  created_at: string;
};

export type Cart = {
  items: CartItem[];
  subtotal_cents: number;
  currency: string;
  count: number;
};

export type CheckoutPreviewItem = {
  course_id: number;
  title: string;
  unit_price_cents: number;
  quantity: number;
};

export type CheckoutPreview = {
  course_id: number | null;
  course_title: string | null;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  complimentary: boolean;
  promo_code: string | null;
  message: string | null;
  items?: CheckoutPreviewItem[];
};

export type CheckoutResult = {
  order_id: number;
  order_number: string;
  enrollment_id: number | null;
  enrollment_ids?: number[];
  total_cents: number;
  currency: string;
  complimentary: boolean;
  checkout_url: string | null;
  status: string;
};

export type OrderItemRow = {
  course_id: number;
  title: string;
  unit_price_cents: number;
  quantity: number;
};

export type OrderRow = {
  id: number;
  number: string;
  name: string;
  status: string;
  created_at: string;
  total_cents: number;
  amount_paid_cents: number;
  balance_cents: number;
  currency: string;
  promo_code?: string | null;
  items?: OrderItemRow[];
};

export type InvoiceRow = {
  id: number;
  number: string;
  bill_date: string;
  period_start: string | null;
  period_end: string | null;
  amount_cents: number;
  amount_paid_cents: number;
  balance_cents: number;
  status: string;
  order_number?: string | null;
};

export type SavedCard = {
  id: number;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  first_name: string;
  last_name: string;
  is_default: boolean;
};

export type SecurityQuestion = {
  id: number;
  question: string;
  sort_order: number;
};
