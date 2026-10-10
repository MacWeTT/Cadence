import { useTranslations } from 'next-intl';
import { translateMsg, type Msg } from './message';

/** In components: `const tm = useMsg();` then `tm(someMessage)` gives its text. Not for async server components. */
export const useMsg = () => {
  const t = useTranslations();

  return (m: Msg) => {
    return translateMsg(t, m);
  };
};
