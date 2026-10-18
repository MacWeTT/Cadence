/** The ways an account can sign in, from the providers Supabase keeps on it (`app_metadata.providers`). */
export interface SignInMethods {
  /** An email and a password. */
  password: boolean;
  google: boolean;
  github: boolean;
}

/** What a signed-in person can link to their account (GitHub joins when its sign-in does). */
export const LINKABLE_PROVIDERS = ['google'] as const;
export type LinkableProvider = (typeof LINKABLE_PROVIDERS)[number];

export const signInMethods = (providers: string[] | undefined): SignInMethods => {
  const has = (name: string): boolean => {
    return providers?.includes(name) ?? false;
  };

  return { password: has('email'), google: has('google'), github: has('github') };
};

/**
 * An account with a password and no Google or GitHub is one forgotten password away from being locked out (there is no
 * mail to reset it), so it is asked to link one. Anything else is not.
 */
export const needsLinking = ({ password, google, github }: SignInMethods): boolean => {
  return password && !google && !github;
};
