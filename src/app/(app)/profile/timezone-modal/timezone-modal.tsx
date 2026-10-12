'use client';

import clsx from 'clsx';
import { ChevronDown, Search, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useUpdateTimezone } from '@/app/(app)/profile/use-profile';
import { SettingModal } from '@/components/setting-modal/setting-modal';
import { Input } from '@/components/ui/input';
import { listZones, modernZone, searchZones, zoneLabel, zoneOffset } from '@/lib/zones';
import './timezone-modal.css';

interface TimezoneModalProps {
  timezone: string;
  onClose: () => void;
}

interface TimezoneState {
  open: boolean;
  query: string;
  selected: string;
  detected: string;
  now: Date;
}

const detectedZone = (): string => {
  return modernZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
};

/** A dropdown filled with your timezone: open it to search the cities and pick one. The warning sits under it. */
export const TimezoneModal = (props: TimezoneModalProps) => {
  const { timezone, onClose } = props;

  // The detected zone and "now" are read once, so the list does not change under the person's finger.
  const [state, setState] = useState<TimezoneState>(() => {
    return { open: false, query: '', selected: timezone, detected: detectedZone(), now: new Date() };
  });

  const t = useTranslations('profile.timezone');
  const update = useUpdateTimezone();

  const { open, query, selected, detected, now } = state;

  // The browser's own zone is pinned first, then the rest by city.
  const zones = useMemo(() => {
    const matches = searchZones(listZones(), query);

    return query.trim() === '' && matches.includes(detected)
      ? [
          detected,
          ...matches.filter(id => {
            return id !== detected;
          }),
        ]
      : matches;
  }, [query, detected]);

  const { city, region } = zoneLabel(selected);

  const onToggle = () => {
    setState({ ...state, open: !open, query: '' });
  };

  const onQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, query: event.target.value });
  };

  const onSave = () => {
    update.mutate(selected);
    onClose();
  };

  return (
    <SettingModal title={t('title')} saveDisabled={selected === timezone} onSave={onSave} onClose={onClose}>
      <div className="timezone-modal__field">
        <button
          type="button"
          aria-label={t('choose')}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={onToggle}
          className="timezone-modal__trigger"
        >
          <span>
            <span className="timezone-modal__city">{city}</span>
            <span className="timezone-modal__region">{region}</span>
          </span>
          <span className="timezone-modal__offset">{zoneOffset(selected, now)}</span>
          <ChevronDown
            aria-hidden
            className={clsx('timezone-modal__chevron', open && 'timezone-modal__chevron--open')}
          />
        </button>
        {open && (
          <div className="timezone-modal__panel">
            <div className="timezone-modal__search">
              <Search aria-hidden className="timezone-modal__search-icon" />
              <Input
                type="search"
                autoFocus
                value={query}
                placeholder={t('search')}
                aria-label={t('search')}
                autoComplete="off"
                onChange={onQueryChange}
                className="timezone-modal__input"
              />
            </div>
            <div role="listbox" aria-label={t('title')} className="timezone-modal__list">
              {zones.length === 0 && <p className="timezone-modal__none">{t('none')}</p>}
              {zones.map(id => {
                const { city: zoneCity, region: zoneRegion } = zoneLabel(id);
                const active = id === selected;

                const onPick = () => {
                  setState({ ...state, selected: id, open: false, query: '' });
                };

                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={onPick}
                    className={clsx('timezone-modal__zone', active && 'timezone-modal__zone--active')}
                  >
                    <span>
                      <span className="timezone-modal__city">{zoneCity}</span>
                      <span className="timezone-modal__region">
                        {[zoneRegion, id === detected ? t('detected') : ''].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="timezone-modal__offset">{zoneOffset(id, now)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div role="note" className="timezone-modal__warning">
        <TriangleAlert aria-hidden className="timezone-modal__warning-icon" />
        <p>
          <strong>{t('warningTitle')}</strong> {t('warning')}
        </p>
      </div>
    </SettingModal>
  );
};
