import type { ReactNode } from "react";

type AlertTone = "error" | "success" | "info" | "warning";

export default function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
}) {
  const tones: Record<AlertTone, string> = {
    error: "border-caisbe-red/20 bg-caisbe-red/5 text-caisbe-red-dark",
    success: "border-admin-success/20 bg-admin-success-soft text-admin-success",
    info: "border-admin-info/20 bg-admin-info-soft text-admin-info",
    warning: "border-admin-warning/20 bg-admin-warning-soft text-admin-warning",
  };

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1 leading-5" : "leading-5"}>{children}</div>
    </div>
  );
}
