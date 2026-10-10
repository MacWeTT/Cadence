import './field-error.css';

interface FieldErrorProps {
  field: string;
  message?: string;
}

/** The red message under a form field. Renders nothing when there is no message. */
export const FieldError = (props: FieldErrorProps) => {
  const { field, message } = props;

  if (!message) {
    return null;
  }

  return (
    <p id={`error-${field}`} role="alert" className="field-error">
      {message}
    </p>
  );
};
