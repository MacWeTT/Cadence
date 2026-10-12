import './row-actions.css';

interface RowActionsProps {
  children: React.ReactNode;
}

/** The round buttons at the end of a habit row (links, then Focus), side by side. */
export const RowActions = (props: RowActionsProps) => {
  const { children } = props;

  return <div className="row-actions">{children}</div>;
};
