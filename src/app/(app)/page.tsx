import { PageTransition } from '@/components/page-transition/page-transition';
import { HomeSkeleton } from '@/components/home-skeleton/home-skeleton';
import { loadHabitData } from '@/server/habit-data';
import { buildHomeView } from '@/server/home-view';
import { HomeClient } from '@/app/(app)/home/home-client/home-client';

const HomePage = () => {
  return (
    <PageTransition fallback={<HomeSkeleton />}>
      <HomeContent />
    </PageTransition>
  );
};

export default HomePage;

const HomeContent = async () => {
  const { entries, ctx, profile } = await loadHabitData();
  const { today, weekStartsOn } = ctx;
  const { displayName, timezone } = profile;

  return (
    <HomeClient
      home={buildHomeView(entries, ctx)}
      today={today}
      name={displayName}
      timezone={timezone}
      weekStartsOn={weekStartsOn}
    />
  );
};
