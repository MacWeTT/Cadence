import './progress-card.css';

interface ProgressCardProps {
  /** The id of the heading that names the card (for screen readers). */
  labelledBy?: string;
  /** Names the card when it has no visible heading id. */
  label?: string;
  children: React.ReactNode;
}

/** The rounded frame every Progress section sits in. */
export const ProgressCard = (props: ProgressCardProps) => {
  const { labelledBy, label, children } = props;

  return (
    <section className="progress-card" aria-labelledby={labelledBy} aria-label={label}>
      {children}
    </section>
  );
};
