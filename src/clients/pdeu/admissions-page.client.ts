import axios from 'axios';

import { withOutboundOptions } from '../../lib/outbound-http.js';

const PDEU_ADMISSIONS_URL = 'https://pdeu.ac.in/admissions';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

/** REST-style client: loads the public admissions HTML (includes `__NEXT_DATA__`). */
export async function fetchPdeuAdmissionsHtml(): Promise<string> {
  const { data } = await axios.get<string>(
    PDEU_ADMISSIONS_URL,
    withOutboundOptions({
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
    }),
  );
  return data;
}
