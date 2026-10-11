import { z } from 'zod';

/** The longest message, in characters. */
export const MESSAGE_LIMIT = 1000;

/** The contact form. An anonymous message never carries a name or an email, whatever was sent. */
export const contactInputSchema = z
  .object({
    message: z.string().trim().min(1, 'messageRequired').max(MESSAGE_LIMIT, 'messageTooLong'),
    anonymous: z.boolean(),
    name: z.string().trim().max(80, 'nameTooLong').optional(),
    email: z
      .string()
      .trim()
      .max(254, 'emailInvalid')
      .refine(value => {
        return value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }, 'emailInvalid')
      .optional(),
  })
  .transform(({ message, anonymous, name, email }) => {
    return { message, anonymous, name: anonymous ? null : name || null, email: anonymous ? null : email || null };
  });

export type ContactInput = z.infer<typeof contactInputSchema>;
