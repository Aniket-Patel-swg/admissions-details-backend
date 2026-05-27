import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';
import {
  DAIICT_BTECH_ALL_INDIA_URL,
  DAIICT_BTECH_GUJARAT_URL,
  DAIICT_BTECH_NRI_URL,
  type DaiictBtechCategory,
} from '../../types/daiict/btech-all-india.types.js';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
};

const URL_BY_CATEGORY: Record<DaiictBtechCategory, string> = {
  all_india: DAIICT_BTECH_ALL_INDIA_URL,
  nri: DAIICT_BTECH_NRI_URL,
  gujarat: DAIICT_BTECH_GUJARAT_URL,
};

export async function fetchDaiictBtechHtml(category: DaiictBtechCategory): Promise<string> {
  const { data } = await axios.get<string>(
    URL_BY_CATEGORY[category],
    withOutboundOptions({
      headers: DEFAULT_HEADERS,
      responseType: 'text',
      timeout: 30_000,
    }),
  );
  return data;
}

/** @deprecated use fetchDaiictBtechHtml('all_india') */
export async function fetchDaiictBtechAllIndiaHtml(): Promise<string> {
  return fetchDaiictBtechHtml('all_india');
}
