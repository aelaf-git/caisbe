"use client";

import type { ButtonHTMLAttributes } from "react";
import Button, { type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

type SaveButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  dirty: boolean;
  saving?: boolean;
  idleLabel?: string;
  savingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function SaveButton({
  dirty,
  saving = false,
  idleLabel = "Save",
  savingLabel = "Saving…",
  disabled,
  type = "button",
  variant = "primary",
  size = "md",
  ...props
}: SaveButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      disabled={!dirty || saving || Boolean(disabled)}
      {...props}
    >
      {saving ? savingLabel : idleLabel}
    </Button>
  );
}
