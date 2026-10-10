import { ratio, type Rate } from '@/domain/rates';

/** "78%", or "No rate yet" when nothing was expected. */
export const percent = (rate: Rate) => {
  const r = ratio(rate);

  return r === null ? 'No rate yet' : `${Math.round(r * 100)}%`;
};

/** The address of the Progress page for a habit filter and a rate window; the defaults stay out of the address. */
export const progressHref = (habit: string | null, range: number) => {
  const params = new URLSearchParams();

  if (habit) {
    params.set('habit', habit);
  }

  if (range !== 30) {
    params.set('range', String(range));
  }

  const query = params.toString();

  return query ? `/progress?${query}` : '/progress';
};
