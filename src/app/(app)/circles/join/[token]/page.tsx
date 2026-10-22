import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { JoinCard } from '@/app/(app)/circles/join-card/join-card';
import { EmptyState } from '@/components/empty-state/empty-state';
import { PageTransition } from '@/components/page-transition/page-transition';
import { Button } from '@/components/ui/button';
import { inviteTokenInput } from '@/lib/circle-schema';
import { previewInvite } from '@/server/circles';
import type { InvitePreview } from '@/server/circles-view';
import { HabitError } from '@/server/habits';

/** What the invite opens, or null when it does not work (a made-up token, an expired one, or one that was replaced). */
const loadPreview = async (token: string): Promise<InvitePreview | null> => {
  if (!inviteTokenInput.safeParse(token).success) {
    return null;
  }

  try {
    return await previewInvite(token);
  } catch (error) {
    if (error instanceof HabitError) {
      return null;
    }

    throw error;
  }
};

// A circle's address carries its id (and an invite's its token), which is only known when someone asks for it, so this
// route cannot be built ahead of time and is allowed to render when requested.
export const instant = false;

/** Where an invite link lands: the circle it opens, and who is in it, with Join and No thanks. */
const JoinPage = async (props: PageProps<'/circles/join/[token]'>) => {
  const { token } = await props.params;

  const t = await getTranslations('circles');
  const preview = await loadPreview(token);

  if (!preview) {
    return (
      <PageTransition>
        <EmptyState
          flush
          title={t('join.invalidTitle')}
          text={t('join.invalidText')}
          action={
            <Button asChild>
              <Link href="/circles">{t('circle.backToList')}</Link>
            </Button>
          }
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <JoinCard token={token} preview={preview} />
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('circles');

  return { title: t('title') };
};

export default JoinPage;
