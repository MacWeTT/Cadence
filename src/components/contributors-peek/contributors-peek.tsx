'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ContributorsList } from '@/components/contributors-list/contributors-list';
import { CONTRIBUTORS, githubUrl } from '@/lib/contributors';
import './contributors-peek.css';

interface ContributorsPeekState {
  open: boolean;
}

/**
 * The credit line on the About page. It names the primary contributor and tucks the rest behind one quiet word:
 * "friendship" opens the list of everyone who has helped build Cadence.
 */
export const ContributorsPeek = () => {
  const [state, setState] = useState<ContributorsPeekState>({ open: false });

  const t = useTranslations('about');

  const { open } = state;
  const [primary] = CONTRIBUTORS;

  const onToggle = () => {
    setState({ open: !open });
  };

  return (
    <div className="contributors-peek">
      <p className="contributors-peek__line">
        {t.rich('builtBy', {
          dev: () => {
            return (
              <a href={githubUrl(primary)} target="_blank" rel="noreferrer" className="contributors-peek__link">
                {primary}
              </a>
            );
          },
          friends: chunks => {
            return (
              <button
                type="button"
                aria-expanded={open}
                aria-controls="contributors"
                onClick={onToggle}
                className="contributors-peek__toggle"
              >
                {chunks}
              </button>
            );
          },
        })}
      </p>
      {open && <ContributorsList />}
    </div>
  );
};
