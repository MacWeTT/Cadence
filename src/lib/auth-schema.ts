import { z } from 'zod';
import { tagInputSchema } from '@/lib/profile-schema';

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
