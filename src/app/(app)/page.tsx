import { Suspense } from 'react';
import { HomeSkeleton } from '@/components/home-skeleton/home-skeleton';
import { loadHabitData } from '@/server/habit-data';
import { buildHomeView } from '@/server/home-view';
import { HomeClient } from './home/home-client/home-client';

const HomePage = () => {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
};

export default HomePage;

const HomeContent = async () => {
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
};
