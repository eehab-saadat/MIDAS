import { LoadingCard } from "@/components/ui/LoadingCard";

export default function EncounterLoading() {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 border-b border-base-300 bg-base-100 px-4 py-3">
        <div className="container mx-auto flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-1">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-3 w-24" />
          </div>
          <div className="ml-auto flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-28 rounded-lg" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LoadingCard lines={4} />
          <LoadingCard lines={3} />
          <LoadingCard lines={5} className="lg:col-span-2" />
        </div>
      </div>
    </div>
  );
}
