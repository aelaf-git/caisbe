import { redirect } from "next/navigation";

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002";

/** Marketing-site /login always opens the student portal login (then dashboard). */
export default function LoginRedirectPage() {
  redirect(`${PORTAL_URL.replace(/\/$/, "")}/login`);
}
