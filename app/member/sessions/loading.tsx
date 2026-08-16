import { MemberSessionCardSkeleton } from "@/components/member/session-card";

export default function MemberSessionsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-64 skeleton rounded" />
        <div className="h-4 w-80 skeleton rounded" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <MemberSessionCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
