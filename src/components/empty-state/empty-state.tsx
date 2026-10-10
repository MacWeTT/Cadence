import { cn } from '@/lib/utils';
import './empty-state.css';

interface EmptyStateProps {
  title: string;
  text: string;
  /** The button that gets the user going. */
  action: React.ReactNode;
  /** Drops the top margin, for a card that follows a header with its own spacing. */
  flush?: boolean;
}

/** The card shown when a page has nothing to list yet. */
export const EmptyState = (props: EmptyStateProps) => {
  const { title, text, action, flush } = props;

  return (
    <div className={cn('empty-state', flush && 'empty-state--flush')}>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__text">{text}</p>
      {action}
    </div>
  );
};
