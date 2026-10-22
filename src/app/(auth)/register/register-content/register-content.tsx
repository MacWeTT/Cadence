import { redirect } from 'next/navigation';
import { RegisterForm } from '@/app/(auth)/register/register-form/register-form';
import { safeNext } from '@/lib/next-path';
import { getRegistration } from '@/server/registration';

interface RegisterContentProps {
  searchParams: Promise<{ next?: string }>;
}

/**
 * The form with the account's own data (its email and default tag). It reads the session, so it is the part of the page
 * that waits for the request; the page around it is built ahead of time. An account that has registered goes straight on.
 */
export const RegisterContent = async (props: RegisterContentProps) => {
  const { searchParams } = props;

  const [{ next }, { email, tag, registered }] = await Promise.all([searchParams, getRegistration()]);

  if (registered) {
    redirect(safeNext(next));
  }

  return <RegisterForm email={email} tag={tag} next={next ?? null} />;
};
