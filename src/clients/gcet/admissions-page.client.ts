import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';
import { GCET_BASE_URL } from '../../types/gcet/admissions.types.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

export const GCET_ADMISSION_PATHS = {
  home: 'admission_home.php',
  ug: 'admission_ug.php',
  pg: 'admission_pg.php',
  feeCirculars: 'admission_circulars.php',
  cutoff: 'admission_cutoff.php',
  admissionGuide: 'admission_help.php',
  scholarship: 'scholarship.php',
} as const;

export type GcetAdmissionPageKey = keyof typeof GCET_ADMISSION_PATHS;

export async function fetchGcetAdmissionPage(path: string): Promise<string> {
  const url = new URL(path, GCET_BASE_URL).href;
  const { data } = await axios.get<string>(
    url,
    withOutboundOptions({
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
    }),
  );
  return data;
}

export async function fetchAllGcetAdmissionHtml(): Promise<Record<GcetAdmissionPageKey, string>> {
  const entries = await Promise.all(
    (Object.entries(GCET_ADMISSION_PATHS) as [GcetAdmissionPageKey, string][]).map(
      async ([key, path]) => [key, await fetchGcetAdmissionPage(path)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<GcetAdmissionPageKey, string>;
}
