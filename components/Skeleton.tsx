export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-2 rounded ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-3 w-56" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-52 w-full rounded-lg" />
    </div>
  );
}
