'use client';

import { Tabs } from 'radix-ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { InlineText } from '@/components/changelog-entry/inline-text';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChangelogEntry } from '@/lib/changelog';
import { cn } from '@/lib/utils';
import './line-changes.css';

interface LineChangesProps {
  /** The window's title ("Version 0.6", "Version 1.0.10"). */
  title: string;
  /** What the button says ("All 0.6 changes"). */
  openLabel: string;
  /** What the window is about, for screen readers. */
  description: string;
  /** The releases whose notes it shows, newest first, in full. */
  releases: ChangelogEntry[];
}

interface ReleaseNotesProps {
  release: ChangelogEntry;
}

/** One release's notes: its date, its note and every change. */
const ReleaseNotes = (props: ReleaseNotesProps) => {
  const { release } = props;
  const { title, date, note, items } = release;

  const t = useTranslations('changelog');

  return (
    <section className="line-changes__release">
      <div className="line-changes__head">
        <h3 className="line-changes__version">{t('version', { version: title })}</h3>
        {date && <time dateTime={date}>{date}</time>}
      </div>
      {note && <p className="line-changes__note">{note}</p>}
      <ul className="line-changes__items">
        {items.map((item, i) => {
          return (
            <li key={i} className="line-changes__item">
              <InlineText parts={item} />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/**
 * A button that opens the full notes of some releases in a window over the page (never a jump to a list). With more than
 * one release, each is a tab named by its version number, the newest first, so the window never needs a long scroll.
 */
export const LineChanges = (props: LineChangesProps) => {
  const { title: windowTitle, openLabel, description, releases } = props;

  const [open, setOpen] = useState(false);

  const onOpen = () => {
    setOpen(true);
  };

  const [newest] = releases;
  // with tabs the window keeps one height, so it does not jump as the notes change from tab to tab
  const tabbed = releases.length > 1;

  return (
    <>
      <button type="button" className="line-changes__open" onClick={onOpen}>
        {openLabel}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn('line-changes', tabbed && 'line-changes--tabbed')}>
          <DialogHeader>
            <DialogTitle className="line-changes__title">{windowTitle}</DialogTitle>
            <DialogDescription className="sr-only">{description}</DialogDescription>
          </DialogHeader>
          {tabbed ? (
            <Tabs.Root defaultValue={newest.title} className="line-changes__tabs-root">
              <Tabs.List className="line-changes__tabs">
                {releases.map(({ title }) => {
                  return (
                    <Tabs.Trigger key={title} value={title} className="line-changes__tab">
                      {title}
                    </Tabs.Trigger>
                  );
                })}
              </Tabs.List>
              {releases.map(release => {
                const { title } = release;

                return (
                  <Tabs.Content key={title} value={title} className="line-changes__panel">
                    <ReleaseNotes release={release} />
                  </Tabs.Content>
                );
              })}
            </Tabs.Root>
          ) : (
            <ReleaseNotes release={newest} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
