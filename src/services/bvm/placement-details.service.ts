import * as cheerio from 'cheerio';

import {
  BVM_PLACEMENT_DETAILS_URL,
  fetchBvmPlacementDetailsHtml,
} from '../../clients/bvm/placement-page.client.js';
import type {
  BvmPlacementDetailRow,
  BvmPlacementDetailsPayload,
} from '../../types/bvm/placement.types.js';

const YEAR_LABEL_PATTERN = /^\d{4}-\d{4}$/;
const PDF_LINK_PATTERN = /\.pdf(?:[?#].*)?$/i;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(href: string): string | null {
  try {
    return new URL(href, BVM_PLACEMENT_DETAILS_URL).toString();
  } catch {
    return null;
  }
}

export function parseBvmPlacementDetailsFromHtml(html: string): BvmPlacementDetailsPayload | null {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const data: BvmPlacementDetailRow[] = [];

  $('a').each((_, anchor) => {
    const academicYear = normalizeText($(anchor).text());
    const href = $(anchor).attr('href');
    if (!href) return;
    if (!YEAR_LABEL_PATTERN.test(academicYear)) return;

    const pdfUrl = toAbsoluteUrl(href);
    if (!pdfUrl || !PDF_LINK_PATTERN.test(pdfUrl)) return;
    if (seen.has(academicYear)) return;

    seen.add(academicYear);
    data.push({
      academic_year: academicYear,
      pdf_url: pdfUrl,
    });
  });

  if (data.length === 0) return null;

  return {
    college: 'bvm',
    page: 'placement_details',
    data,
  };
}

export async function getBvmPlacementDetails(): Promise<BvmPlacementDetailsPayload | null> {
  try {
    const html = await fetchBvmPlacementDetailsHtml();
    return parseBvmPlacementDetailsFromHtml(html);
  } catch (error) {
    console.error('BVM placement details scrape failed:', error);
    return null;
  }
}
