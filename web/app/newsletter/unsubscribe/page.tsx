import type { Metadata } from "next";
import { Suspense } from "react";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata: Metadata = {
  title: "Unsubscribe | CAISBE",
  description: "Unsubscribe from the CAISBE newsletter.",
};

export default function NewsletterUnsubscribePage() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center px-6 py-16">
      <Suspense
        fallback={
          <p className="text-center text-base text-ifma-navy/70">Processing your request…</p>
        }
      >
        <UnsubscribeClient />
      </Suspense>
    </main>
  );
}
