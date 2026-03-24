"use client";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-4 gap-1" : "py-10 gap-3"}`}
    >
      {icon && (
        <div className="text-base-content/30">{icon}</div>
      )}
      <p
        className={`font-medium text-base-content/50 ${compact ? "text-sm" : "text-base"}`}
      >
        {title}
      </p>
      {description && (
        <p className="text-sm text-base-content/40 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
