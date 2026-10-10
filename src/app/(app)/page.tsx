import { Suspense } from "react";
import { HomeSkeleton } from "@/components/skeleton";
import { loadHabitData } from "@/server/habit-data";
import { buildHomeView } from "@/server/home-view";
import { HomeClient } from "./home/home-client";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const { entries, ctx, profile } = await loadHabitData();
  return (
    <HomeClient
      home={buildHomeView(entries, ctx)}
      today={ctx.today}
      name={profile.displayName}
      timezone={profile.timezone}
      weekStartsOn={ctx.weekStartsOn}
    />
  );
}
