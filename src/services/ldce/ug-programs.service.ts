import * as cheerio from 'cheerio';

import { fetchLdceUgProgramsHtml } from '../../clients/ldce/ug-programs.client.js';
import {
  LDCE_UG_PROGRAMS_URL,
  type LdceUgInfoItem,
  type LdceUgProgramsResponse,
} from '../../types/ldce/ug-programs.types.js';

const LDCE_ORIGIN = 'https://ldce.ac.in';

function resolveHref(href: string | undefined): string | null {
  if (!href?.trim()) return null;
  try {
    return new URL(href, LDCE_ORIGIN).href;
  } catch {
    return null;
  }
}

export function parseLdceUgProgramsHtml(html: string): LdceUgProgramsResponse | null {
  const $ = cheerio.load(html);

  const table = $('table').filter((_, el) => {
    const headers = $(el)
      .find('thead th')
      .map((__, th) => $(th).text().trim())
      .get();
    return headers.includes('Intake') && headers.includes('Name of Course');
  });

  if (!table.length) return null;

  const programs: LdceUgProgramsResponse['programs'] = [];
  table.find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;
    const serial = Number.parseInt($(cells[0]).text().trim(), 10);
    const link = $(cells[1]).find('a').first();
    const name = link.length ? link.text().trim() : $(cells[1]).text().trim();
    const periodYears = Number.parseInt($(cells[2]).text().trim(), 10);
    const intake = Number.parseInt($(cells[3]).text().trim(), 10);
    if (!name || Number.isNaN(intake)) return;
    programs.push({
      serial: Number.isNaN(serial) ? programs.length + 1 : serial,
      name,
      courseUrl: resolveHref(link.attr('href')),
      periodYears: Number.isNaN(periodYears) ? 4 : periodYears,
      intake,
    });
  });

  if (!programs.length) return null;

  const infoItems: LdceUgInfoItem[] = [];
  const row = table.closest('[class*="md:flex-row"]');
  if (row.length) {
    row.find('div.flex-1 ul li').each((_, li) => {
      const $li = $(li);
      const text = $li.text().replace(/\s+/g, ' ').trim();
      if (!text) return;
      const firstA = $li.find('a').first();
      const href = firstA.length ? resolveHref(firstA.attr('href')) : null;
      infoItems.push({ text, href });
    });
  }

  const totalIntake = programs.reduce((sum, p) => sum + p.intake, 0);

  return {
    sourceUrl: LDCE_UG_PROGRAMS_URL,
    infoItems,
    programs,
    totalIntake,
  };
}

export async function getLdceUgPrograms(): Promise<LdceUgProgramsResponse | null> {
  try {
    const html = await fetchLdceUgProgramsHtml();
    return parseLdceUgProgramsHtml(html);
  } catch (error) {
    console.error('LDCE UG programs scraping failed:', error);
    return null;
  }
}
