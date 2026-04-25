export function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[152px] sm:w-[168px] space-y-2.5">
      <div className="skeleton w-full aspect-[2/3] rounded-2xl" />
      <div className="skeleton h-3 w-4/5 rounded-lg" />
      <div className="skeleton h-2.5 w-1/2 rounded-lg" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="skeleton w-1 h-5 rounded-full" />
        <div className="skeleton h-5 w-36 rounded-lg" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="skeleton w-full" style={{ height: "clamp(480px, 75vh, 680px)" }} />
  );
}
