import type { Inline } from '@/lib/changelog';

interface InlineTextProps {
  parts: Inline[];
}

/** A bullet of the changelog: plain text, **bold** and `code`, drawn without raw HTML. */
export const InlineText = (props: InlineTextProps) => {
  const { parts } = props;

  return parts.map((part, i) => {
    const { kind, text } = part;

    if (kind === 'bold') {
      return <strong key={i}>{text}</strong>;
    }

    if (kind === 'code') {
      return (
        <code key={i} className="changelog-entry__code">
          {text}
        </code>
      );
    }

    return <span key={i}>{text}</span>;
  });
};
