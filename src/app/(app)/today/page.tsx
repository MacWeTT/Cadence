import { Suspense } from "react";
import { getTodayView } from "@/server/today";
import { TodayClient } from "./today-client";

export default function TodayPage({ searchParams }: PageProps<"/today">) {
  return (
    <Suspense fallback={<h1 className="font-display text-4xl">Today</h1>}>
      <TodayContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TodayContent({ searchParams }: { searchParams: PageProps<"/today">["searchParams"] }) {
  const { date } = await searchParams;
  return <TodayClient {...await getTodayView(date)} />;
}
