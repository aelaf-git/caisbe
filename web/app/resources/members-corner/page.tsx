import { redirect } from "next/navigation";

/** Legacy Members Corner URL → Media */
export default function MembersCornerRedirectPage() {
  redirect("/resources/media");
}
