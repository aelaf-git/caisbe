import { redirect } from "next/navigation";

/** Legacy /register on the marketing site now opens membership registration. */
export default function RegisterRedirectPage() {
  redirect("/membership/become-a-member");
}
