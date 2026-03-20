"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  stretch?: boolean;
};

export function Button({
  className,
  variant = "primary",
  stretch = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "button",
        `button--${variant}`,
        stretch && "button--stretch",
        className,
      )}
      {...props}
    />
  );
}
