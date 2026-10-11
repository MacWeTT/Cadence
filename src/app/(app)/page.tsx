import { PageTransition } from '@/components/page-transition/page-transition';
import { HomeLoader } from '@/app/(app)/home/home-loader/home-loader';

const HomePage = () => {
  return (
    <PageTransition>
      <HomeLoader />
    </PageTransition>
  );
};

export default HomePage;
