'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { NewCircleModal } from '@/app/(app)/circles/new-circle-modal/new-circle-modal';
import { Scenery } from '@/components/scenery/scenery';
import { Button } from '@/components/ui/button';
import './circles-welcome.css';

interface WelcomeState {
  creating: boolean;
}

/** What the right-hand side shows on a wide screen before a circle is picked. On a phone the list takes its place. */
export const CirclesWelcome = () => {
  const [state, setState] = useState<WelcomeState>({ creating: false });

  const t = useTranslations('circles');

  const { creating } = state;

  const onNewClick = () => {
    setState({ creating: true });
  };

  const onNewClose = () => {
    setState({ creating: false });
  };

  return (
    <div className="circles-welcome">
      <Scenery variant="scene" />
      <h2 className="circles-welcome__title">{t('welcomeTitle')}</h2>
      <p className="circles-welcome__text">{t('intro')}</p>
      <Button onClick={onNewClick}>{t('newCircle')}</Button>
      {creating && <NewCircleModal onClose={onNewClose} />}
    </div>
  );
};
