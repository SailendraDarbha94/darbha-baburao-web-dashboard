import { LoadingStatus, Skeleton, SkeletonText } from "@/components/skeleton";

// Generic fallback for any admin route that has no loading.tsx of its own. The routes that exist today
// (/claims, /claims/[id], /agents) each have one that mirrors their real layout; this is the safety net
// for anything added later, and for the group's own segment.
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-4">
      <LoadingStatus label="Loading" />
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-col gap-2">
        <SkeletonText />
        <SkeletonText />
        <SkeletonText className="w-2/3" />
      </div>
    </div>
  );
}
