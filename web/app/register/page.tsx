import { redirect } from "next/navigation";
import { portalMembershipRegisterUrl } from "@/lib/api";

/** Legacy /register on the marketing site opens portal membership registration. */
export default function RegisterRedirectPage() {
  redirect(portalMembershipRegisterUrl());
}
