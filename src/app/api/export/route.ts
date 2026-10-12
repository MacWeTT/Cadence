import { todayIn } from '@/domain/dates';
import { backupFileName, toJson } from '@/lib/backup';
import { toCsv } from '@/lib/backup-csv';
import { isSignedIn } from '@/server/account';
import { getBackup } from '@/server/backup';

const TYPES = { json: 'application/json', csv: 'text/csv' } as const;

/** The account's data as a file to download: `?format=json` or `?format=csv`. Only ever the caller's own rows. */
export const GET = async (request: Request) => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get('format');

  if (format !== 'json' && format !== 'csv') {
    return Response.json({ error: 'format' }, { status: 400 });
  }

  const backup = await getBackup();
  const { exportedAt, profile } = backup;
  const body = format === 'json' ? toJson(backup) : toCsv(backup);
  const name = backupFileName(todayIn(profile.timezone, new Date(exportedAt)), format);

  return new Response(body, {
    headers: {
      'Content-Type': `${TYPES[format]}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
};
