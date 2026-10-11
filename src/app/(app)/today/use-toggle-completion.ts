import { useTranslations } from 'next-intl';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { CalendarDate } from '@/domain/dates';
import { applyToggle, type TodayRow, type TodayView } from '@/server/today-view';
import { setCompletionAction } from '@/app/(app)/today/actions';

/**
 * Ticking for any page that shows a TodayView: instant (optimistic) moves between the lists, one request per row at a
 * time, a toast and a rollback when the save fails, and keyboard focus that follows the row to its new list.
 */
export const useToggleCompletion = (view: TodayView, date: CalendarDate) => {
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());

  const t = useTranslations('errors');
  const [, startTransition] = useTransition();

  // The optimistic view reverts by itself when the transition ends: to the server's new view after a refresh, or to
  // the old one if the save failed.
  const [shown, showToggle] = useOptimistic(view, (current, { id, ticked }: { id: string; ticked: boolean }) => {
    return applyToggle(current, id, ticked);
  });

  const inFlight = useRef(new Set<string>()); // a ref as well, so two taps in one render still send one request
  const focusId = useRef<string | null>(null);

  // A ticked row moves to the other list, which remounts its button and drops keyboard focus; put it back. Only when the
  // lists change, so a page that re-renders for other reasons (Home's clock) never pulls focus back from where you went.
  useEffect(() => {
    if (focusId.current && document.activeElement === document.body) {
      document.getElementById(`check-${focusId.current}`)?.focus();
    }
  }, [shown]);

  // Once you press or click anything else, focus is yours: stop restoring it.
  useEffect(() => {
    const forget = () => {
      focusId.current = null;
    };

    document.addEventListener('pointerdown', forget);
    document.addEventListener('keydown', forget);

    return () => {
      document.removeEventListener('pointerdown', forget);
      document.removeEventListener('keydown', forget);
    };
  }, []);

  const toggle = (row: TodayRow) => {
    const { id, ticked: wasTicked } = row;

    if (inFlight.current.has(id)) {
      return;
    }

    inFlight.current.add(id);
    focusId.current = id;
    setSaving(new Set(inFlight.current));
    const ticked = !wasTicked;

    startTransition(async () => {
      showToggle({ id: id, ticked });

      try {
        const result = await setCompletionAction(id, date, ticked);

        if (!result.ok) {
          toast.error(result.error);
        }
      } catch {
        toast.error(t('saveFailed'));
      } finally {
        inFlight.current.delete(id);
        setSaving(new Set(inFlight.current));
      }
    });
  };

  return { shown, saving, toggle };
};
