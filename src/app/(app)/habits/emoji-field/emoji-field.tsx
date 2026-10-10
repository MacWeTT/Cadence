'use client';

import {
  EmojiPicker,
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
} from 'frimousse';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import './emoji-field.css';

const CategoryHeader = (props: EmojiPickerListCategoryHeaderProps) => {
  const { category, ...rest } = props;

  return (
    <div className="emoji-field__category" {...rest}>
      {category.label}
    </div>
  );
};

const GridRow = (props: EmojiPickerListRowProps) => {
  const { children, ...rest } = props;

  return (
    <div className="emoji-field__row" {...rest}>
      {children}
    </div>
  );
};

const EmojiButton = (props: EmojiPickerListEmojiProps) => {
  const { emoji, ...rest } = props;

  return (
    <button type="button" className="emoji-field__emoji" {...rest}>
      {emoji.emoji}
    </button>
  );
};

interface EmojiFieldProps {
  value: string;
  onChange: (emoji: string) => void;
}

/** The emoji button of the habit dialog. Opens a searchable grid; picking an emoji closes it. */
export const EmojiField = (props: EmojiFieldProps) => {
  const { value, onChange } = props;

  const [open, setOpen] = useState(false);

  const t = useTranslations('habits.emoji');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t('choose')} className="emoji-field__trigger">
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="emoji-field__popover">
        <EmojiPicker.Root
          className="emoji-field__root"
          onEmojiSelect={({ emoji }) => {
            onChange(emoji);
            setOpen(false);
          }}
        >
          <EmojiPicker.Search
            placeholder={t('search')}
            aria-label={t('search')}
            autoFocus
            className="emoji-field__search"
          />
          <EmojiPicker.Viewport className="emoji-field__viewport">
            <EmojiPicker.Loading className="emoji-field__message">{t('loading')}</EmojiPicker.Loading>
            <EmojiPicker.Empty className="emoji-field__message">{t('none')}</EmojiPicker.Empty>
            <EmojiPicker.List
              className="emoji-field__list"
              components={{ CategoryHeader, Row: GridRow, Emoji: EmojiButton }}
            />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
};
