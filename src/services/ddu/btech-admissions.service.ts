import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

import { fetchDduAdmissionFotHtml } from '../../clients/ddu/admissions-page.client.js';
import {
  DDU_ADMISSION_FOT_URL,
  DDU_SITE_ORIGIN,
  type DduAdmissionLink,
  type DduBtechAdmissionPayload,
  type DduBtechCategory,
  type DduLinkKind,
} from '../../types/ddu/btech-admissions.types.js';

export const DDU_BTECH_CATEGORIES: DduBtechCategory[] = ['acpc', 'management', 'jee'];

function clean(s: string): string {
  return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectKind(url: string): DduLinkKind {
  const u = url.toLowerCase();
  if (u.includes('docs.google.com') || u.includes('forms.gle')) return 'google_form';
  if (u.endsWith('.pdf')) return 'pdf';
  if (u.endsWith('.docx')) return 'docx';
  return 'other';
}

function absoluteUrl(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return new URL(t.replace(/^\//, ''), DDU_SITE_ORIGIN + '/').href;
}

function extractOpenUrl(onclick: string | undefined): string | null {
  if (!onclick) return null;
  const m = onclick.match(/window\.open\(\s*['"]([^'"]+)['"]/i);
  return m?.[1] ? absoluteUrl(m[1]) : null;
}

/** Find the latest orange section banner text before this tile in document order. */
function sectionBefore($: cheerio.CheerioAPI, el: AnyNode): string | null {
  let $walk = $(el).parent();
  for (let i = 0; i < 8 && $walk.length; i++) {
    const prev = $walk.prevAll('.borderBOrg').first();
    if (prev.length) {
      const t = clean(prev.find('.orgBg').first().text());
      if (t) return t;
    }
    $walk = $walk.parent();
  }
  return null;
}

export function parseDduAdmissionLinksFromHtml(html: string): DduAdmissionLink[] {
  const $ = cheerio.load(html);
  const out: DduAdmissionLink[] = [];
  $('div.borderBlack.cursor[onclick]').each((_, el) => {
    const url = extractOpenUrl($(el).attr('onclick'));
    if (!url) return;
    const title = clean($(el).find('td.bodytextOrgSm2').first().text());
    if (!title) return;
    out.push({
      title,
      url,
      kind: detectKind(url),
      section: sectionBefore($, el),
    });
  });
  return out;
}

function titleHas(t: string, ...subs: string[]): boolean {
  const x = t.toLowerCase();
  return subs.some((s) => x.includes(s.toLowerCase()));
}

function filterForCategory(links: DduAdmissionLink[], category: DduBtechCategory): DduAdmissionLink[] {
  return links.filter((L) => {
    const t = L.title;
    if (category === 'management') {
      if (titleHas(t, 'management quota', '(mq)')) return true;
      if (titleHas(t, 'nri')) return true;
      if (titleHas(t, 'contact details', 'mq/nri')) return true;
      if (titleHas(t, 'nri sponsorship')) return true;
      if (titleHas(t, 'general information')) return true;
      if (titleHas(t, 'general instruction')) return true;
      return false;
    }
    if (category === 'jee') {
      if (titleHas(t, 'general information')) return true;
      if (titleHas(t, 'general instruction')) return true;
      return false;
    }
    // acpc: GUJCET / state merit — same public documents as JEE on this page
    if (titleHas(t, 'general information')) return true;
    if (titleHas(t, 'general instruction')) return true;
    return false;
  });
}

function notesForCategory(category: DduBtechCategory): string | null {
  if (category === 'management') return null;
  if (category === 'jee') {
    return 'Online application forms on this page are for Management / NRI quotas only. JEE merit intake for B.Tech. (including seat split vs GUJCET) is summarized in the seat matrix PDF linked below; follow ACPC / state counselling notices when published.';
  }
  return 'Online application forms on this page are for Management / NRI quotas only. ACPC / GUJCET merit intake is summarized in the seat matrix PDF linked below; follow ACPC announcements and the university site after JEE/GUJCET/board results.';
}

export function normalizeDduCategoryParam(raw: string | undefined): DduBtechCategory | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/-/g, '_');
  return (DDU_BTECH_CATEGORIES as string[]).includes(key) ? (key as DduBtechCategory) : null;
}

export function buildDduPayload(
  links: DduAdmissionLink[],
  category: DduBtechCategory,
): DduBtechAdmissionPayload {
  return {
    university: 'ddu',
    programme: 'btech',
    category,
    sourceUrl: DDU_ADMISSION_FOT_URL,
    notes: notesForCategory(category),
    links: filterForCategory(links, category),
  };
}

export async function getDduBtechAdmissionCategory(
  category: DduBtechCategory,
): Promise<DduBtechAdmissionPayload | null> {
  try {
    const html = await fetchDduAdmissionFotHtml();
    const links = parseDduAdmissionLinksFromHtml(html);
    if (!links.length) return null;
    return buildDduPayload(links, category);
  } catch (e) {
    console.error('DDU B.Tech admissions scrape failed:', e);
    return null;
  }
}
