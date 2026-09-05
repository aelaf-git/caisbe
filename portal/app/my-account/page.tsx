import { redirect } from "next/navigation";

export default function LegacyMyAccountPage() {
  redirect("/dashboard");
}
