import { SignInCard } from '@/app/(app)/profile/account/sign-in-card/sign-in-card';
import { DeleteCard } from '@/app/(app)/profile/account/delete-card/delete-card';
import { ExportCard } from '@/app/(app)/profile/account/export-card/export-card';
import { ImportCard } from '@/app/(app)/profile/account/import-card/import-card';
import './account-content.css';

/** The Account tab: how you sign in, take your data out, put it back, or leave. */
export const AccountContent = () => {
  return (
    <div className="account-content">
      <SignInCard />
      <ExportCard />
      <ImportCard />
      <DeleteCard />
    </div>
  );
};
