import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';

const AU_CALENDAR_URL =
  'https://ahduni.edu.in/admission/undergraduate-admission/admission-calendar';
const AU_FEES_URL = 'https://ahduni.edu.in/admission/fees-financial-aid/';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

export async function fetchAuCalendarHtml(): Promise<string> {
  const { data } = await axios.get<string>(
    AU_CALENDAR_URL,
    withOutboundOptions({
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
    }),
  );
  return data;
}

export async function fetchAuFeesHtml(): Promise<string> {
  const { data } = await axios.get<string>(
    AU_FEES_URL,
    withOutboundOptions({
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
    }),
  );
  return data;
}
