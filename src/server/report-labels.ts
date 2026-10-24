import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { CalendarDate } from '@/domain/dates';
import { getMsg } from '@/i18n/get-msg';
import { buildReportLabels } from '@/server/report-labels-build';
import type { ReportLabels } from '@/server/report-pdf';

/** The words of the PDF report, from the message files, with the person's name and today filled in. */
export const getReportLabels = async (name: string, today: CalendarDate): Promise<ReportLabels> => {
  return buildReportLabels(await getTranslations('account.report'), await getMsg(), name, today);
};
