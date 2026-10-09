import { Suspense } from "react";
import { listHabits } from "@/server/habits";
import { HabitsClient } from "./habits-client";

export default function HabitsPage() {
  return (
    <Suspense fallback={<h1 className="font-display text-4xl">Habits</h1>}>
      <HabitsContent />
    </Suspense>
  );
}

async function HabitsContent() {
  const view = await listHabits();
  return <HabitsClient view={view} />;
}
