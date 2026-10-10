import { Suspense } from "react";
import { ListSkeleton } from "@/components/skeleton";
import { listHabits } from "@/server/habits";
import { HabitsClient } from "./habits-client";

export default function HabitsPage() {
  return (
    <Suspense fallback={<ListSkeleton title="Habits" />}>
      <HabitsContent />
    </Suspense>
  );
}

async function HabitsContent() {
  const view = await listHabits();
  return <HabitsClient view={view} />;
}
