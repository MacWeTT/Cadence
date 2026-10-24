import { createTranslator } from 'next-intl';
import type { FieldIssue } from '@/lib/habit-schema';
import { msg, translateMsg, type MessageKey } from '@/lib/message';
import type { ErrorCode } from '@/server/habits';
import en from '@locales/en';

/** An expected failure: the message to show, and which fields of the form it is about. */
export class ChangeError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly fieldIssues?: Record<string, FieldIssue>,
  ) {
    super(code);
  }
}

/** The desktop app speaks English until the languages land; there is no React here, so no `useTranslations`. */
export const t = createTranslator({ locale: 'en', messages: en });

export interface Failure {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export const describe = (code: ErrorCode, fieldIssues?: Record<string, FieldIssue>): Failure => {
  return {
    ok: false,
    error: translateMsg(t, msg(`errors.${code}`)),
    fieldErrors: fieldIssues
      ? Object.fromEntries(
          Object.entries(fieldIssues).map(([field, { code: issue, values }]) => {
            return [field, translateMsg(t, msg(`validation.${issue}` as MessageKey, values))];
          }),
        )
      : undefined,
  };
};

/** What a thrown error answers: an expected one says its message, anything else is logged and says "couldn't save". */
export const failed = (e: unknown): Failure => {
  if (e instanceof ChangeError) {
    const { code, fieldIssues } = e;

    return describe(code, fieldIssues);
  }

  console.error(e);

  return describe('saveFailed');
};
