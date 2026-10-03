import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
};

export default function Card({ padding = "md", className = "", ...props }: CardProps) {
  const spacing = {
    none: "",
    sm: "p-4",
    md: "p-5 md:p-6",
    lg: "p-6 md:p-8",
  }[padding];

  return (
    <div
      className={`rounded-[20px] bg-admin-surface shadow-hopewell ${spacing} ${className}`}
      {...props}
    />
  );
}
