import { PageTransition } from '@/components/page-transition/page-transition';
import { HomeSkeleton } from '@/components/home-skeleton/home-skeleton';
import { loadHabitData } from '@/server/habit-data';
import { buildHomeView } from '@/server/home-view';
import { HomeClient } from './home/home-client/home-client';

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
