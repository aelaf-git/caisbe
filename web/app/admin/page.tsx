import { redirect } from "next/navigation";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export default function AdminRedirectPage() {
  redirect(`${ADMIN_URL}/login`);
}
