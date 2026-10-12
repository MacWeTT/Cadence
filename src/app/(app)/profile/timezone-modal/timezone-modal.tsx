'use client';

import clsx from 'clsx';
import { Search, TriangleAlert } from 'lucide-react';
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

const detectedZone = (): string => {
  return modernZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
};

/** A searchable list of cities, then the warning that "today" shifts. Only a listed zone can be chosen. */
export const TimezoneModal = (props: TimezoneModalProps) => {
  const { timezone, onClose } = props;

  // The detected zone and "now" are read once, so the list does not change under the person's finger.
  const [form, setForm] = useState(() => {
    return { query: '', selected: timezone, detected: detectedZone(), now: new Date() };
  });

  const t = useTranslations('profile.timezone');
  const update = useUpdateTimezone();

  const { query, selected, detected, now } = form;

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

  const onQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, query: event.target.value });
  };

  const onSave = () => {
    update.mutate(selected);
    onClose();
  };

  return (
    <SettingModal title={t('title')} saveDisabled={selected === timezone} onSave={onSave} onClose={onClose}>
      <div className="timezone-modal__search">
        <Search aria-hidden className="timezone-modal__search-icon" />
        <Input
          type="search"
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
          const { city, region } = zoneLabel(id);
          const active = id === selected;

          const onPick = () => {
            setForm({ ...form, selected: id });
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
                <span className="timezone-modal__city">{city}</span>
                <span className="timezone-modal__region">
                  {[region, id === detected ? t('detected') : ''].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="timezone-modal__offset">{zoneOffset(id, now)}</span>
            </button>
          );
        })}
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
