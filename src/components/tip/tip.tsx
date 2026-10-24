'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TipProps {
  /** What the control does, in a few words (usually the same text as its aria-label). */
  label: string;
  /** The control: a button or a link that has no visible text of its own. */
  children: React.ReactElement;
}

interface TipState {
  open: boolean;
  /** Pressed: the control did its job, so its tooltip stays away until the pointer leaves or focus moves on. */
  pressed: boolean;
}

/**
 * A tooltip for a control that is only an icon, so anyone can tell what it does. It closes when the control is used and
 * stays closed after: a tooltip left open over the dialog the control just opened would take the first Escape.
 */
export const Tip = (props: TipProps) => {
  const { label, children } = props;

  const [state, setState] = useState<TipState>({ open: false, pressed: false });

  const { open, pressed } = state;

  const onOpenChange = (next: boolean) => {
    setState(current => {
      return { ...current, open: next };
    });
  };

  const onPress = () => {
    setState({ open: false, pressed: true });
  };

  const onRelease = () => {
    setState(current => {
      return { ...current, pressed: false };
    });
  };

  return (
    <Tooltip open={open && !pressed} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild onClick={onPress} onPointerLeave={onRelease} onBlur={onRelease}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};
