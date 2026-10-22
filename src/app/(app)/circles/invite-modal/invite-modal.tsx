'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCreateInvite } from '@/app/(app)/circles/use-circles';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteUrl } from '@/lib/circle-people';
import './invite-modal.css';

interface InviteModalProps {
  circleId: string;
  onClose: () => void;
}

/** The link to share for a token, on this site (read in the browser, when the invite is made). */
const linkOf = (token: string) => {
  return inviteUrl(window.location.origin, token);
};

/** Makes an invite link as soon as it opens, and lets the owner copy it or replace it with a new one. */
export const InviteModal = (props: InviteModalProps) => {
  const { circleId, onClose } = props;

  const [state, setState] = useState<{ url: string | null }>({ url: null });

  const t = useTranslations('circles.invite');
  const { mutate, isPending } = useCreateInvite();
  const field = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  const { url } = state;

  const makeLink = () => {
    mutate(circleId, {
      onSuccess: token => {
        setState({ url: linkOf(token) });
      },
    });
  };

  // The first link is made once, even when React runs this effect twice while developing.
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      mutate(circleId, {
        onSuccess: token => {
          setState({ url: linkOf(token) });
        },
      });
    }
  }, [circleId, mutate]);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const onCopyClick = async () => {
    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('copied'));
    } catch {
      // The clipboard can be blocked; the link is selected so it can be copied by hand.
      field.current?.select();
    }
  };

  const onRenewClick = () => {
    makeLink();
  };

  const onLinkFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="invite-modal">
        <DialogHeader>
          <DialogTitle className="invite-modal__title">{t('title')}</DialogTitle>
          <DialogDescription className="invite-modal__description">{t('description')}</DialogDescription>
        </DialogHeader>
        <Label htmlFor="circle-invite-link">{t('linkLabel')}</Label>
        <Input
          ref={field}
          id="circle-invite-link"
          readOnly
          value={url ?? ''}
          placeholder={isPending ? t('making') : ''}
          onFocus={onLinkFocus}
        />
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onRenewClick}>
            {t('renew')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('done')}
          </Button>
          <Button disabled={!url || isPending} onClick={onCopyClick}>
            {t('copy')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
