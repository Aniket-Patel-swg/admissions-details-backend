import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';
import { DDU_ADMISSION_FOT_URL } from '../../types/ddu/btech-admissions.types.js';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Referer: 'https://www.ddu.ac.in/',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
};

export async function fetchDduAdmissionFotHtml(): Promise<string> {
  const { data } = await axios.get<string>(
    DDU_ADMISSION_FOT_URL,
    withOutboundOptions({
      headers: DEFAULT_HEADERS,
      responseType: 'text',
      timeout: 30_000,
    }),
  );
  return data;
}
