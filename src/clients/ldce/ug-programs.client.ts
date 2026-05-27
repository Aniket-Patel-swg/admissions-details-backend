import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';
import { LDCE_UG_PROGRAMS_URL } from '../../types/ldce/ug-programs.types.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

export async function fetchLdceUgProgramsHtml(): Promise<string> {
  const { data } = await axios.get<string>(
    LDCE_UG_PROGRAMS_URL,
    withOutboundOptions({
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Referer: 'https://ldce.ac.in/admissions',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': USER_AGENT,
        'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
      },
      responseType: 'text',
    }),
  );
  return data;
}
