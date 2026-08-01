import { redirect } from "next/navigation";

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002";

export default function MyAccountRedirectPage() {
  redirect(`${PORTAL_URL}/my-account`);
}
