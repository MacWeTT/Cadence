'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { openLinks } from '@/lib/open-links';
import './open-links-button.css';

interface OpenLinksButtonProps {
  links: string[];
  /** The habit's name, for the button's label. */
  name: string;
}

/** Opens all of a habit's links, each in its own tab. Says so when the browser blocked some of them. */
export const OpenLinksButton = (props: OpenLinksButtonProps) => {
  const { links, name } = props;

  const t = useTranslations('common.links');
  const { length: count } = links;

  const onClick = () => {
    if (openLinks(links) < count) {
      toast.error(t('blocked'));
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={t('open', { name })} onClick={onClick} className="open-links-button">
          <ExternalLink className="open-links-button__icon" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t('tooltip', { count })}</TooltipContent>
    </Tooltip>
  );
};
