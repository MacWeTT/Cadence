import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/app/(app)/habits/field-error/field-error';
import { LinkRow } from '@/app/(app)/habits/link-row/link-row';
import './links-field.css';

export const MAX_LINKS = 10;

interface LinksFieldProps {
  links: string[];
  onChange: (links: string[]) => void;
  error?: string;
}

/** The links of a habit, opened together from its row: a row per link and a button to add one. */
export const LinksField = (props: LinksFieldProps) => {
  const { links, onChange, error } = props;

  const t = useTranslations('habits.dialog.links');
  const { length: count } = links;

  const onLinkChange = (index: number, value: string) => {
    onChange(
      links.map((link, i) => {
        return i === index ? value : link;
      }),
    );
  };

  const onRemove = (index: number) => {
    onChange(
      links.filter((_, i) => {
        return i !== index;
      }),
    );
  };

  const onAdd = () => {
    onChange([...links, '']);
  };

  return (
    <div>
      <p className="links-field__label" id="links-label">
        {t('title')}
      </p>
      {count > 0 && (
        <ul aria-labelledby="links-label" className="links-field__list">
          {links.map((link, index) => {
            return (
              // The rows are edited in place and only ever added at the end or removed, so the index is a stable key.
              <LinkRow
                key={index}
                index={index}
                value={link}
                invalid={Boolean(error)}
                onChange={onLinkChange}
                onRemove={onRemove}
              />
            );
          })}
        </ul>
      )}
      <FieldError field="links" message={error} />
      {count < MAX_LINKS && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="links-field__add">
          <Plus aria-hidden />
          {t('add')}
        </Button>
      )}
      <p className="links-field__hint">{t('hint')}</p>
    </div>
  );
};
