import { redirect } from "next/navigation";

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002";

export default function LoginRedirectPage() {
  redirect(`${PORTAL_URL}/login`);
}
