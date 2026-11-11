"use client";

import { useMemo } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

export default function EmbeddedStripeCheckout({
  publishableKey,
  clientSecret,
}: {
  publishableKey: string;
  clientSecret: string;
}) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <div className="mt-4 border border-ifma-border bg-white">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
