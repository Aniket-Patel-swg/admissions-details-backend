import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';

export const NIRMA_BTECH_URL = 'https://admissions.nirmauni.ac.in/btech.html';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  Referer: 'https://admissions.nirmauni.ac.in/',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
};

export async function fetchNirmaBtechHtml(): Promise<string> {
  const { data } = await axios.get<string>(
    NIRMA_BTECH_URL,
    withOutboundOptions({
      headers: DEFAULT_HEADERS,
      responseType: 'text',
      timeout: 30_000,
    }),
  );
  return data;
}
