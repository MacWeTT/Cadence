'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import './why-disabled.css';

interface WhyDisabledProps {
  /** Why the control is off, in a sentence; nothing when it is on. */
  reason: string | null | undefined;
  /** The control. A disabled control cannot be hovered, so the tooltip sits on a wrapper around it. */
  children: React.ReactElement;
}

/** Says why a control is disabled, on hover or focus. With no reason, the control is shown as it is. */
export const WhyDisabled = (props: WhyDisabledProps) => {
  const { reason, children } = props;

  if (!reason) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="why-disabled">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
};
