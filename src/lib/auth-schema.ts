import { z } from 'zod';
import { NAME_MAX } from '@/lib/profile-schema';

/** Passwords are at least this long; the same number is `minimum_password_length` in supabase/config.toml. */
export const PASSWORD_MIN = 8;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .refine(value => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
  }, 'authEmailInvalid');

const newPassword = z.string().min(PASSWORD_MIN, 'passwordShort').max(72, 'passwordLong');

/** Signing in only asks that something was typed: whether it is right is Supabase's to say. */
export const signInInputSchema = z.object({
  email,
  password: z.string().min(1, 'passwordRequired'),
});

export const signUpInputSchema = z.object({
  name: z.string().trim().min(1, 'profileNameRequired').max(NAME_MAX, 'profileNameTooLong'),
  email,
  password: newPassword,
});

export const passwordChangeSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine(({ password, confirm }) => {
    return password === confirm;
  }, 'passwordMismatch');
