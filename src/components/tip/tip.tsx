'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TipProps {
  /** What the control does, in a few words (usually the same text as its aria-label). */
  label: string;
  /** The control: a button or a link that has no visible text of its own. */
  children: React.ReactElement;
}

/** A tooltip for a control that is only an icon, so anyone can tell what it does. */
export const Tip = (props: TipProps) => {
  const { label, children } = props;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};
