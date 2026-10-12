import { ChevronRight } from 'lucide-react';
import './setting-row.css';

interface SettingRowProps {
  label: string;
  /** What the setting is now: text, or a small picture and text. */
  children: React.ReactNode;
  onOpen: () => void;
}

/** One line of the profile: the setting's name, what it is now, and a chevron. Pressing it opens that setting's modal. */
export const SettingRow = (props: SettingRowProps) => {
  const { label, children, onOpen } = props;

  return (
    <button type="button" className="setting-row" onClick={onOpen}>
      <span className="setting-row__label">{label}</span>
      <span className="setting-row__value">{children}</span>
      <ChevronRight aria-hidden className="setting-row__chevron" />
    </button>
  );
};
