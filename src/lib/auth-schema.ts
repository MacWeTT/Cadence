import { z } from 'zod';
import { tagInputSchema } from '@/lib/profile-schema';
import { normaliseTag } from '@/lib/tag';

/** Passwords are at least this long; the same number is `minimum_password_length` in supabase/config.toml. */
export const PASSWORD_MIN = 8;

/** bcrypt, which Supabase hashes with, only reads the first 72 characters. */
const PASSWORD_MAX = 72;

const newPassword = z.string().min(PASSWORD_MIN, 'passwordShort').max(PASSWORD_MAX, 'passwordLong');

const matching = ({ password, confirm }: { password: string; confirm: string }): boolean => {
  return password === confirm;
};

/** The set-or-change password modal: a new password, typed twice. */
export const passwordChangeSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine(matching, 'passwordMismatch');

/** The register screen after a first Google or GitHub sign-in: the tag to keep, and a password, typed twice. */
export const registerInputSchema = z
  .object({ tag: tagInputSchema.shape.tag, password: newPassword, confirm: z.string() })
  .refine(matching, 'passwordMismatch');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .refine(value => {
    return EMAIL.test(value) && value.length <= EMAIL_MAX;
  }, 'authEmailInvalid');

/**
 * Signing in by tag or by email. Only that something was typed is checked here (and that an email looks like one):
 * whether the password is right is for the database and Supabase to say. The password is kept exactly as typed.
 */
export const signInInputSchema = z
  .object({ mode: z.enum(['tag', 'email']), identifier: z.string(), password: z.string().min(1, 'passwordRequired') })
  .transform(({ mode, identifier, password }) => {
    return { mode, identifier: mode === 'tag' ? normaliseTag(identifier) : identifier.trim().toLowerCase(), password };
  })
  .refine(({ identifier }) => {
    return identifier !== '';
  }, 'identifierRequired')
  .refine(({ mode, identifier }) => {
    return mode === 'tag' || (EMAIL.test(identifier) && identifier.length <= EMAIL_MAX);
  }, 'authEmailInvalid');

/** Creating an account with an email: the email, the tag to have, and a password typed twice. */
export const signUpInputSchema = z
  .object({ email, tag: tagInputSchema.shape.tag, password: newPassword, confirm: z.string() })
  .refine(matching, 'passwordMismatch');
