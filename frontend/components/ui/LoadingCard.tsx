"use client";

interface LoadingCardProps {
  lines?: number;
  className?: string;
}

export function LoadingCard({ lines = 3, className = "" }: LoadingCardProps) {
  return (
    <div className={`card bg-base-100 border border-base-300 ${className}`}>
      <div className="card-body gap-3">
        <div className="skeleton h-5 w-1/3" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-4"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
