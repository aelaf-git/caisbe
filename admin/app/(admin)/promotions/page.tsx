import { redirect } from "next/navigation";

export default function PromotionsRedirectPage() {
  redirect("/fees#discounts");
}
