export default function PatientDetailsLoading() {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Navbar skeleton */}
      <div className="navbar min-h-0 bg-base-200 px-4 py-2">
        <div className="skeleton h-10 w-10 rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Breadcrumb skeleton */}
        <div className="skeleton h-4 w-48 mb-4" />

        {/* Header card skeleton */}
        <div className="card bg-base-100 border border-base-300 shadow-sm mb-6">
          <div className="card-body py-5">
            <div className="flex items-center gap-4">
              <div className="skeleton w-14 h-14 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="skeleton h-6 w-48" />
                <div className="skeleton h-4 w-64" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>

        {/* List skeleton */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
