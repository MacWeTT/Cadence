import clsx from 'clsx';
import './account-card.css';

interface AccountCardProps {
  title: string;
  intro: string;
  /** A red card, for the one thing that cannot be undone. */
  danger?: boolean;
  children: React.ReactNode;
}

/** One section of the Account tab: a title, a sentence about it, and its controls. */
export const AccountCard = (props: AccountCardProps) => {
  const { title, intro, danger, children } = props;

  return (
    <section className={clsx('account-card', danger && 'account-card--danger')}>
      <h2 className="account-card__title">{title}</h2>
      <p className="account-card__intro">{intro}</p>
      {children}
    </section>
  );
};
