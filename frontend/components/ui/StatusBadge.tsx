"use client";

type BadgeVariant =
  | "processing"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  processing: "badge-warning",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
  neutral: "badge-ghost",
};

export function StatusBadge({
  variant,
  label,
  pulse = false,
}: StatusBadgeProps) {
  return (
    <span
      className={`badge badge-sm gap-1 ${variantClasses[variant]} ${pulse ? "animate-pulse" : ""}`}
    >
      {variant === "processing" && (
        <span className="loading loading-spinner loading-xs" />
      )}
      {label}
    </span>
  );
}
