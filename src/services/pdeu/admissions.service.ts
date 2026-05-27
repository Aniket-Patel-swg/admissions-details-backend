import * as cheerio from 'cheerio';

import { fetchPdeuAdmissionsHtml } from '../../clients/pdeu/admissions-page.client.js';
import type { AdmissionProgramRow } from '../../types/pdeu/admission.types.js';

const PROGRAM_ALIASES: Record<string, string> = {
  'All India': 'B.Tech. - All India',
  ACPC: 'B.Tech. - ACPC',
};

interface SideTab {
  ctg_name?: string;
  text_msg?: string;
}

interface SideBlock {
  tabs?: SideTab[];
}

function resolveProgramKey(targetCategory: string): string {
  return PROGRAM_ALIASES[targetCategory] ?? targetCategory;
}

export async function getAdmissionDetails(
  targetCategory: string,
): Promise<AdmissionProgramRow | null> {
  try {
    const html = await fetchPdeuAdmissionsHtml();
    return parseAdmissionDetailsFromHtml(html, targetCategory);
  } catch (error) {
    console.error('Scraping failed:', error);
    return null;
  }
}

export async function getAllAdmissionPrograms(): Promise<AdmissionProgramRow[] | null> {
  try {
    const html = await fetchPdeuAdmissionsHtml();
    return parseAllProgramsFromHtml(html);
  } catch (error) {
    console.error('Scraping failed:', error);
    return null;
  }
}

export function parseAdmissionDetailsFromHtml(
  html: string,
  targetCategory: string,
): AdmissionProgramRow | null {
  const $ = cheerio.load(html);
  const programKey = resolveProgramKey(targetCategory);

  let nextJson: unknown = null;
  const raw = $('#__NEXT_DATA__').html();
  if (raw) {
    try {
      nextJson = JSON.parse(raw) as unknown;
    } catch {
      /* ignore */
    }
  }

  let result = tryScrapeFromDom($, targetCategory);
  if (!result && nextJson) {
    result = tryStructuredTab(nextJson, programKey, targetCategory);
  }
  if (!result && nextJson) {
    result = tryLegacyFragments(nextJson, targetCategory);
  }

  return result;
}

function parseAllProgramsFromHtml(html: string): AdmissionProgramRow[] | null {
  const $ = cheerio.load(html);
  const raw = $('#__NEXT_DATA__').html();
  if (!raw) return null;

  let nextJson: unknown;
  try {
    nextJson = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  return extractAllProgramsFromNextJson(nextJson);
}

function extractAllProgramsFromNextJson(nextJson: unknown): AdmissionProgramRow[] | null {
  const sections = getSideSections(nextJson);
  if (!sections) return null;

  const seen = new Set<string>();
  const programs: AdmissionProgramRow[] = [];

  for (const block of Object.values(sections) as SideBlock[]) {
    const tabs = block?.tabs;
    if (!Array.isArray(tabs)) continue;

    for (const tab of tabs) {
      const name = tab?.ctg_name;
      if (typeof name !== 'string' || !name || typeof tab?.text_msg !== 'string') continue;
      if (seen.has(name)) continue;
      seen.add(name);

      const cleanText = cheerio.load(tab.text_msg).text().replace(/\s+/g, ' ');
      const dates = cleanText.includes('Important Dates')
        ? extractDatesFromCleanText(cleanText)
        : { startDate: null, lastDate: null };

      programs.push({ category: name, ...dates });
    }
  }

  return programs;
}

function getSideSections(nextJson: unknown): Record<string, SideBlock> | null {
  if (!nextJson || typeof nextJson !== 'object') return null;
  const props = (nextJson as { props?: { pageProps?: { data?: { page_data?: { side_sections?: unknown } } } } })
    .props?.pageProps?.data?.page_data?.side_sections;
  if (!props || typeof props !== 'object') return null;
  return props as Record<string, SideBlock>;
}

function tryScrapeFromDom(
  $: ReturnType<typeof cheerio.load>,
  targetCategory: string,
): AdmissionProgramRow | null {
  let result: AdmissionProgramRow | null = null;
  $('.Text_htmlText__3amRo').each((_, element) => {
    const blockText = $(element).text();
    if (blockText.includes(targetCategory) && blockText.includes('Important Dates')) {
      const cleanText = blockText.replace(/\s+/g, ' ');
      result = { category: targetCategory, ...extractDatesFromCleanText(cleanText) };
      return false;
    }
  });
  return result;
}

function tryStructuredTab(
  nextJson: unknown,
  programKey: string,
  categoryLabel: string,
): AdmissionProgramRow | null {
  const html = getTabHtmlForProgram(nextJson, programKey);
  if (!html) return null;

  const cleanText = cheerio.load(html).text().replace(/\s+/g, ' ');
  if (!cleanText.includes('Important Dates')) return null;

  return { category: categoryLabel, ...extractDatesFromCleanText(cleanText) };
}

function getTabHtmlForProgram(nextJson: unknown, programKey: string): string | null {
  const sections = getSideSections(nextJson);
  if (!sections) return null;

  for (const block of Object.values(sections)) {
    const tabs = block?.tabs;
    if (!Array.isArray(tabs)) continue;
    for (const tab of tabs) {
      if (tab?.ctg_name === programKey && typeof tab?.text_msg === 'string') {
        return tab.text_msg;
      }
    }
  }
  return null;
}

function tryLegacyFragments(nextJson: unknown, targetCategory: string): AdmissionProgramRow | null {
  const fragments = collectDateFragments(nextJson);
  const html = pickFragmentForCategory(fragments, targetCategory);
  if (!html) return null;

  const cleanText = cheerio.load(html).text().replace(/\s+/g, ' ');
  return { category: targetCategory, ...extractDatesFromCleanText(cleanText) };
}

function extractDatesFromCleanText(cleanText: string): Pick<AdmissionProgramRow, 'startDate' | 'lastDate'> {
  const startMatch = cleanText.match(
    /Application Start Date\s*[:-]\s*(.+?)(?=\s*(?:Last Date of Application|Scholarships|Fees Structure|Fee Structure|Particulars|$))/is,
  );
  const lastMatch = cleanText.match(
    /Last Date of Application\s*[:-]\s*(.+?)(?=\s*(?:Particulars|Scholarships|Fees Structure|Fee Structure|Detailed|Hostel|Note:|Commencement|For GATE|$))/is,
  );

  let startDate = startMatch ? startMatch[1].trim() : null;
  let lastDate = lastMatch ? lastMatch[1].trim() : null;

  if (lastDate && lastDate.length > 180) {
    lastDate = null;
  }

  return { startDate, lastDate };
}

function collectDateFragments(obj: unknown): string[] {
  const out: string[] = [];
  function walk(o: unknown): void {
    if (typeof o === 'string') {
      if (o.includes('Important Dates') && /Application Start Date:/i.test(o)) out.push(o);
      return;
    }
    if (Array.isArray(o)) {
      o.forEach(walk);
      return;
    }
    if (o && typeof o === 'object') {
      Object.values(o).forEach(walk);
    }
  }
  walk(obj);
  return out;
}

function pickFragmentForCategory(fragments: string[], targetCategory: string): string | null {
  if (targetCategory === 'All India') {
    return (
      fragments.find(
        (f) => f.includes('B.Tech. Admissions 2026') && !f.includes('ACPC (B.Tech.) Admissions 2026'),
      ) ?? null
    );
  }
  if (targetCategory === 'ACPC') {
    return fragments.find((f) => f.includes('ACPC (B.Tech.) Admissions 2026')) ?? null;
  }
  return fragments.find((f) => f.includes(targetCategory) && f.includes('Important Dates')) ?? null;
}
