import * as cheerio from 'cheerio';

import { fetchNirmaPlacementReportsHtml } from '../../clients/nirma/placement-reports-page.client.js';
import type {
  NirmaPlacementReportRow,
  NirmaPlacementReportsPayload,
} from '../../types/nirma/placement.types.js';

export function parseNirmaPlacementReportsFromHtml(html: string): NirmaPlacementReportsPayload | null {
  const $ = cheerio.load(html);
  const data: NirmaPlacementReportRow[] = [];

  $('div.alert.alert-primary a[href]').each((_, anchor) => {
    const title = $(anchor).text().replace(/\s+/g, ' ').trim();
    const href = $(anchor).attr('href');
    if (!title || !href) return;

    data.push({ title, pdf_url: href });
  });

  if (data.length === 0) return null;

  return {
    college: 'nirma',
    institute: 'management',
    page: 'placement_reports',
    data,
  };
}

export async function getNirmaPlacementReports(): Promise<NirmaPlacementReportsPayload | null> {
  try {
    const html = await fetchNirmaPlacementReportsHtml();
    return parseNirmaPlacementReportsFromHtml(html);
  } catch (error) {
    console.error('Nirma management placement reports scrape failed:', error);
    return null;
  }
}
