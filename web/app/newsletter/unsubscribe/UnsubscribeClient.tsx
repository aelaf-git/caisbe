"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeNewsletter } from "@/lib/api";

type Status = "loading" | "success" | "error";

export default function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Processing your request…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setMessage("This unsubscribe link is missing or incomplete.");
        }
        return;
      }
      try {
        const result = await unsubscribeNewsletter({ token });
        if (!cancelled) {
          setStatus("success");
          setMessage(result.message);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            err instanceof Error ? err.message : "Unable to unsubscribe. Try again later.",
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-caisbe-red">
        CAISBE Newsletter
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ifma-navy">
        {status === "success" ? "Unsubscribed" : status === "error" ? "Unable to unsubscribe" : "Unsubscribe"}
      </h1>
      <p
        className={`mt-4 text-base leading-relaxed ${
          status === "error" ? "text-caisbe-red" : "text-ifma-navy/80"
        }`}
        role={status === "error" ? "alert" : undefined}
      >
        {message}
      </p>
    </div>
  );
}
