import { todayIn } from '@/domain/dates';
import { backupFileName, toJson } from '@/lib/backup';
import { toCsv } from '@/lib/backup-csv';
import { isSignedIn } from '@/server/account';
import { getBackup } from '@/server/backup';
import { buildReport } from '@/server/report-model';
import { getReportLabels } from '@/server/report-labels';
import { renderReportPdf } from '@/server/report-pdf';

const TYPES = {
  json: 'application/json; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  pdf: 'application/pdf',
} as const;

/** The account's data as a file to download: `?format=json`, `csv` or `pdf`. Only ever the caller's own rows. */
export const GET = async (request: Request) => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get('format');

  if (format !== 'json' && format !== 'csv' && format !== 'pdf') {
    return Response.json({ error: 'format' }, { status: 400 });
  }

  const backup = await getBackup();
  const { exportedAt, profile } = backup;
  const { name, timezone, weekStartsOn } = profile;
  const today = todayIn(timezone, new Date(exportedAt));

  let body: string | Buffer;

  if (format === 'pdf') {
    const report = buildReport(backup, today, weekStartsOn);

    body = Buffer.from(await renderReportPdf(report, await getReportLabels(name, today)));
  } else {
    body = format === 'json' ? toJson(backup) : toCsv(backup);
  }

  return new Response(body as BodyInit, {
    headers: {
      'Content-Type': TYPES[format],
      'Content-Disposition': `attachment; filename="${backupFileName(today, format)}"`,
      'Cache-Control': 'no-store',
    },
  });
};
