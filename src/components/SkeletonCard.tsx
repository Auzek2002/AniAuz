export function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-40 sm:w-44 space-y-2">
      <div className="skeleton w-full aspect-[2/3] rounded-xl" />
      <div className="skeleton h-3 w-3/4 rounded" />
      <div className="skeleton h-2 w-1/2 rounded" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-48 rounded" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="skeleton w-full h-[70vh] min-h-[480px] max-h-[700px]" />
  );
}
