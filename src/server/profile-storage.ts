import 'server-only';
import type en from '@locales/en';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** A failure the person can act on. The code is a message in `locales/en/validation.json` or `errors.json`. */
type ProfileErrorCode = keyof typeof en.validation | keyof typeof en.errors;

export class ProfileError extends Error {
  constructor(readonly code: ProfileErrorCode) {
    super(code);
  }
}

export type Bucket = 'avatars' | 'sounds';

/** Links that last long enough for a day of use; the profile query refetches before they run out. */
const SIGNED_SECONDS = 60 * 60 * 12;

/** Signed links by storage path. A file that cannot be signed (missing) is left out. */
export const signedUrls = async (bucket: Bucket, paths: string[]): Promise<Record<string, string>> => {
  if (paths.length === 0) {
    return {};
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_SECONDS);

  if (error) {
    throw error;
  }

  const urls: Record<string, string> = {};

  for (const { path, signedUrl } of data) {
    if (path && signedUrl) {
      urls[path] = signedUrl;
    }
  }

  return urls;
};

export const putFile = async (bucket: Bucket, path: string, bytes: Uint8Array, contentType: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType, upsert: false });

  if (error) {
    throw error;
  }
};

/** Removing a file is housekeeping: a failure is logged and does not fail the edit that is already saved. */
export const removeFiles = async (bucket: Bucket, paths: string[]): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    console.error(error);
  }
};
