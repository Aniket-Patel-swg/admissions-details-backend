import * as cheerio from 'cheerio';
import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';

import { fetchDaiictBtechHtml } from '../../clients/daiict/admissions-page.client.js';
import {
  DAIICT_BASE_URL,
  type AdmissionCriteriaData,
  type AdmissionProceduresData,
  type DaiictBtechCategory,
  type DaiictBtechSectionData,
  type DaiictBtechSectionKey,
  type DaiictBtechSectionPayload,
  type DaiictContentItem,
  type EligibilityData,
  type FaqsData,
  type FeeStructureData,
  type FeeStructureRow,
  type ForInquiriesData,
  type HowToApplyData,
  type ImportantDatesData,
  type ImportantDatesEntry,
  type ImportantNotesData,
  type IntakeData,
  type IntakeProgrammeRow,
  type PlacementStatisticsData,
  type PostAdmissionProceduresData,
  type ProgramStructureItem,
  type ProgramStructuresData,
  type ScholarshipLink,
  type ScholarshipsData,
  type SelectionCriteriaData,
} from '../../types/daiict/btech-all-india.types.js';

/** Per-category section → tab panel id mapping (the DAIICT page tab IDs differ per category). */
const TAB_ID_BY_CATEGORY: Record<
  DaiictBtechCategory,
  Partial<Record<DaiictBtechSectionKey, string>>
> = {
  all_india: {
    important_dates: 'tab-1',
    intake: 'tab-2',
    program_structures: 'tab-3',
    placement_statistics: 'tab-10',
    eligibility_criteria: 'tab-4',
    selection_criteria: 'tab-5',
    fee_structure: 'tab-6',
    scholarships: 'tab-11',
    how_to_apply: 'tab-7',
    faqs: 'tab-12',
    for_inquiries: 'tab-8',
    important_notes: 'tab-9',
  },
  nri: {
    important_dates: 'tab-1',
    intake: 'tab-2',
    program_structures: 'tab-11',
    placement_statistics: 'tab-12',
    eligibility_criteria: 'tab-3',
    admission_criteria: 'tab-4',
    fee_structure: 'tab-5',
    scholarships: 'tab-14',
    how_to_apply: 'tab-6',
    admission_procedures: 'tab-7',
    post_admission_procedures: 'tab-8',
    faqs: 'tab-13',
    for_inquiries: 'tab-9',
    important_notes: 'tab-10',
  },
  gujarat: {
    important_dates: 'tab-1',
    intake: 'tab-2',
    program_structures: 'tab-3',
    placement_statistics: 'tab-10',
    fee_structure: 'tab-6',
    scholarships: 'tab-11',
    how_to_apply: 'tab-7',
    faqs: 'tab-12',
    for_inquiries: 'tab-8',
    important_notes: 'tab-9',
  },
};

export const DAIICT_BTECH_CATEGORIES: DaiictBtechCategory[] = ['all_india', 'nri', 'gujarat'];

export function listDaiictSectionKeys(category: DaiictBtechCategory): DaiictBtechSectionKey[] {
  return Object.keys(TAB_ID_BY_CATEGORY[category]) as DaiictBtechSectionKey[];
}

/** Back-compat: callers using the original All India helper. */
export const DAIICT_BTECH_ALL_INDIA_SECTION_KEYS = listDaiictSectionKeys('all_india');

function isCategory(s: string): s is DaiictBtechCategory {
  return DAIICT_BTECH_CATEGORIES.includes(s as DaiictBtechCategory);
}

type Loaded = ReturnType<typeof cheerio.load>;
type Pane = Cheerio<AnyNode>;

function clean(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href: string | undefined | null): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h) || h.startsWith('mailto:') || h.startsWith('tel:')) return h;
  if (h.startsWith('//')) return `https:${h}`;
  if (h.startsWith('/')) return `${DAIICT_BASE_URL}${h}`;
  return h;
}

function deobfuscateEmail(s: string): string {
  return s
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .trim();
}

function isHidden($: Loaded, el: AnyNode): boolean {
  return $(el).hasClass('displayNone') || $(el).closest('.displayNone').length > 0;
}

/** Collect list items from a (possibly nested) <ul>/<ol>, flattening sub-lists. */
function collectNestedListItems($: Loaded, $list: Cheerio<AnyNode>): string[] {
  const out: string[] = [];
  $list.find('> li').each((_, li) => {
    const $li = $(li);
    const directText = clean(
      $li.clone().children('ul, ol').remove().end().text(),
    );
    if (directText) out.push(directText);
    $li.children('ul, ol').each((__, sub) => {
      out.push(...collectNestedListItems($, $(sub)));
    });
  });
  return out;
}

/** Walk direct children turning h3/h4 → heading, p → paragraph, ul/ol → list. */
function buildRichContent(pane: Pane, $: Loaded): DaiictContentItem[] {
  const content: DaiictContentItem[] = [];
  pane.children().each((_, el) => {
    if (isHidden($, el)) return;
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    if (tag === 'h3' || tag === 'h4') {
      const text = clean($el.text());
      if (text) content.push({ kind: 'heading', text });
    } else if (tag === 'p') {
      const text = clean($el.text());
      if (text) content.push({ kind: 'paragraph', text });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = collectNestedListItems($, $el);
      if (items.length) content.push({ kind: 'list', items });
    } else if (tag === 'center') {
      const text = clean($el.text());
      if (text) content.push({ kind: 'paragraph', text });
    }
  });
  return content;
}

function buildImportantDates(pane: Pane, $: Loaded): ImportantDatesData {
  const entries: ImportantDatesEntry[] = [];
  pane.find('table tbody tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < 2) return;
    const label = clean($(cells[0]).text());
    const date = clean($(cells[1]).text());
    if (label) entries.push({ label, date });
  });
  return { entries };
}

function buildIntake(pane: Pane, $: Loaded): IntakeData {
  const totalRaw = clean(pane.find('h4').first().text());
  const total_seats = totalRaw.replace(/^.*?:\s*/, '');
  const programmes: IntakeProgrammeRow[] = [];
  pane.find('ul li').each((_, li) => {
    const text = clean($(li).text());
    const m = text.match(/^(.*?)\s*[–-]\s*(\d[\d,]*)\s*$/);
    if (m) {
      programmes.push({ programme: clean(m[1] ?? ''), seats: clean(m[2] ?? '') });
    } else if (text) {
      programmes.push({ programme: text, seats: '' });
    }
  });
  return { total_seats, programmes };
}

function buildProgramStructures(pane: Pane, $: Loaded): ProgramStructuresData {
  const programmes: ProgramStructureItem[] = [];
  let current: ProgramStructureItem | null = null;
  const descParts: string[] = [];

  const flush = (): void => {
    if (!current) return;
    current.description = clean(descParts.join(' '));
    programmes.push(current);
    current = null;
    descParts.length = 0;
  };

  pane.children().each((_, el) => {
    const $el = $(el);
    const tag = el.tagName?.toLowerCase();
    if (tag === 'h2') {
      flush();
      current = {
        programme: clean($el.text()),
        description: '',
        brochure_url: null,
        more_info_url: null,
      };
    } else if (current && tag === 'p') {
      descParts.push(clean($el.text()));
      const more = $el.find('a[href]').first();
      if (more.length && !current.more_info_url) {
        current.more_info_url = absoluteUrl(more.attr('href'));
      }
    } else if (current && tag === 'div') {
      const brochure = $el.find('a.button[href]').first();
      if (brochure.length && !current.brochure_url) {
        current.brochure_url = absoluteUrl(brochure.attr('href'));
      }
    }
  });
  flush();
  return { programmes };
}

function buildPlacementStatistics(pane: Pane, $: Loaded): PlacementStatisticsData {
  const imgs = pane
    .find('img')
    .toArray()
    .map((img) => absoluteUrl($(img).attr('src')));
  return {
    placement_image_url: imgs[0] ?? null,
    prominent_recruiters_image_url: imgs[1] ?? null,
  };
}

function buildEligibility(pane: Pane, $: Loaded): EligibilityData {
  return { content: buildRichContent(pane, $) };
}

function buildSelectionCriteria(pane: Pane, $: Loaded): SelectionCriteriaData {
  const paragraphs = pane
    .find('p')
    .toArray()
    .filter((p) => !isHidden($, p))
    .map((p) => clean($(p).text()))
    .filter(Boolean);
  return { paragraphs };
}

function buildAdmissionCriteria(pane: Pane, $: Loaded): AdmissionCriteriaData {
  return { content: buildRichContent(pane, $) };
}

function buildAdmissionProcedures(pane: Pane, $: Loaded): AdmissionProceduresData {
  return { content: buildRichContent(pane, $) };
}

function buildPostAdmissionProcedures(pane: Pane, $: Loaded): PostAdmissionProceduresData {
  return { content: buildRichContent(pane, $) };
}

function detectFeeCurrency(rows: FeeStructureRow[]): 'INR' | 'USD' | null {
  const blob = rows.map((r) => r.amount).join(' ');
  if (/US\s*\$|^\$|USD/i.test(blob)) return 'USD';
  if (/Rs\.?|INR|₹/i.test(blob)) return 'INR';
  return null;
}

function buildFeeStructure(pane: Pane, $: Loaded): FeeStructureData {
  const fees: FeeStructureRow[] = [];
  pane.find('table tbody tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < 2) return;
    const description = clean($(cells[0]).text());
    const amount = clean($(cells[1]).text());
    if (description) fees.push({ description, amount });
  });

  // Intro is the first paragraph relative to the table; treat any paragraph that
  // sits before the value-added/loan/refund headings as "intro candidate" and pick
  // the first one (handles both layouts: intro-above-table on all_india,
  // intro-below-table on nri).
  let intro: string | null = null;
  const notes: string[] = [];
  const value_added_courses_notes: string[] = [];
  let education_loan: string | null = null;
  let refund_policy: string | null = null;

  let mode: 'notes' | 'vac' | 'loan' | 'refund' = 'notes';
  pane.children().each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    if (tag === 'h3' || tag === 'h4') {
      const heading = clean($el.text()).toLowerCase();
      if (heading.includes('education loan')) mode = 'loan';
      else if (heading.includes('refund')) mode = 'refund';
      else if (
        heading.includes('b.tech') ||
        heading.includes('value added') ||
        heading.includes('subject to revision')
      )
        mode = 'vac';
      else mode = 'notes';
      return;
    }
    if (tag !== 'p') return;
    const text = clean($el.text());
    if (!text) return;
    if (mode === 'notes') {
      if (intro === null) intro = text;
      else notes.push(text);
    } else if (mode === 'vac') value_added_courses_notes.push(text);
    else if (mode === 'loan') education_loan = education_loan ? `${education_loan} ${text}` : text;
    else if (mode === 'refund') refund_policy = refund_policy ? `${refund_policy} ${text}` : text;
  });

  return {
    intro,
    currency: detectFeeCurrency(fees),
    fees,
    notes,
    value_added_courses_notes,
    education_loan,
    refund_policy,
  };
}

function buildScholarships(pane: Pane, $: Loaded): ScholarshipsData {
  const introduction = clean(pane.find('.grayBox p').first().text()) || null;
  const highlights = pane
    .find('.grayBox ul li')
    .toArray()
    .map((li) => clean($(li).text()))
    .filter(Boolean);

  // The DAU scholarships description sits below an h3/h4 whose text mentions
  // "DAU Scholarship", "Merit Scholarship", or "DAFS".
  const dauHeading = pane
    .find('h3, h4')
    .filter((_, h) => {
      const t = clean($(h).text()).toLowerCase();
      return (
        t.includes('dau scholarship') ||
        t.includes('dafs') ||
        (t.includes('dau') && t.includes('merit'))
      );
    })
    .first();
  const dau_scholarships = clean(dauHeading.nextAll('p').first().text()) || null;

  const other_scholarship_links: ScholarshipLink[] = [];
  pane.find('ul.bulletText').each((_, ul) => {
    if ($(ul).closest('.grayBox').length || $(ul).closest('.accordDetail').length) return;
    $(ul)
      .find('> li')
      .each((__, li) => {
        const $a = $(li).find('a[href]').first();
        const url = absoluteUrl($a.attr('href'));
        const liText = clean($(li).text()).replace(/:\s*Website\s*$/i, '');
        if (url) other_scholarship_links.push({ label: liText || clean($a.text()), url });
      });
  });

  const ug_scholarship_links: ScholarshipLink[] = [];
  pane.find('.accordDetail a[href]').each((_, a) => {
    const $a = $(a);
    const url = absoluteUrl($a.attr('href'));
    const label = clean($a.text());
    if (url && label) ug_scholarship_links.push({ label, url });
  });

  return {
    introduction,
    highlights,
    dau_scholarships,
    other_scholarship_links,
    ug_scholarship_links,
  };
}

function buildHowToApply(pane: Pane, $: Loaded): HowToApplyData {
  let apply_url: string | null = null;
  pane.find('a[href]').each((_, a) => {
    const href = absoluteUrl($(a).attr('href'));
    if (href && /admission\.dau\.ac\.in/i.test(href) && !apply_url) apply_url = href;
  });
  const notes = collectNestedListItems($, pane.find('> ul').first());
  if (notes.length === 0) {
    pane.find('ul').each((_, ul) => {
      if (notes.length) return;
      const items = collectNestedListItems($, $(ul));
      if (items.length) notes.push(...items);
    });
  }
  // Fallback: some category pages (e.g. gujarat) put the instruction as a single
  // heading/paragraph instead of a list.
  if (notes.length === 0) {
    pane.find('> h3, > h4, > p').each((_, el) => {
      if (isHidden($, el)) return;
      const text = clean($(el).text());
      if (text) notes.push(text);
    });
  }
  return { apply_url, notes };
}

function buildFaqs(pane: Pane, $: Loaded): FaqsData {
  const p = pane.find('p').first();
  const link = p.find('a[href]').first();
  return {
    description: clean(p.text()),
    faqs_url: absoluteUrl(link.attr('href')),
  };
}

function buildForInquiries(pane: Pane, $: Loaded): ForInquiriesData {
  const heading = clean(pane.find('h3').first().text()) || null;
  let organization: string | null = null;
  let address: string | null = null;
  let voice_call: string | null = null;
  let email: string | null = null;

  pane.find('p').each((_, p) => {
    if (isHidden($, p)) return;
    const $p = $(p);
    const raw = clean($p.text());
    if (!raw) return;
    const lower = raw.toLowerCase();
    if (lower.startsWith('voice call')) {
      voice_call = raw.replace(/^voice call[^:]*:\s*/i, '').trim() || null;
    } else if (lower.startsWith('email')) {
      const after = raw.replace(/^email:\s*/i, '').trim();
      email = deobfuscateEmail(after) || null;
    } else if (organization === null) {
      organization = raw;
    } else if (address === null) {
      address = raw;
    }
  });

  return { heading, organization, address, voice_call, email };
}

function buildImportantNotes(pane: Pane, $: Loaded): ImportantNotesData {
  const paragraphs = pane
    .find('p')
    .toArray()
    .filter((p) => !isHidden($, p))
    .map((p) => clean($(p).text()))
    .filter(Boolean);
  return { paragraphs };
}

function buildSectionData(
  section: DaiictBtechSectionKey,
  pane: Pane,
  $: Loaded,
): DaiictBtechSectionData | null {
  switch (section) {
    case 'important_dates':
      return buildImportantDates(pane, $);
    case 'intake':
      return buildIntake(pane, $);
    case 'program_structures':
      return buildProgramStructures(pane, $);
    case 'placement_statistics':
      return buildPlacementStatistics(pane, $);
    case 'eligibility_criteria':
      return buildEligibility(pane, $);
    case 'selection_criteria':
      return buildSelectionCriteria(pane, $);
    case 'admission_criteria':
      return buildAdmissionCriteria(pane, $);
    case 'fee_structure':
      return buildFeeStructure(pane, $);
    case 'scholarships':
      return buildScholarships(pane, $);
    case 'how_to_apply':
      return buildHowToApply(pane, $);
    case 'admission_procedures':
      return buildAdmissionProcedures(pane, $);
    case 'post_admission_procedures':
      return buildPostAdmissionProcedures(pane, $);
    case 'faqs':
      return buildFaqs(pane, $);
    case 'for_inquiries':
      return buildForInquiries(pane, $);
    case 'important_notes':
      return buildImportantNotes(pane, $);
    default:
      return null;
  }
}

export function parseDaiictBtechSectionFromHtml(
  html: string,
  category: DaiictBtechCategory,
  section: DaiictBtechSectionKey,
): DaiictBtechSectionPayload | null {
  const tabId = TAB_ID_BY_CATEGORY[category][section];
  if (!tabId) return null;
  const $ = cheerio.load(html);
  const pane = $(`#${tabId} .programsDetailsTab`).first();
  if (!pane.length) return null;

  const data = buildSectionData(section, pane, $);
  if (data === null) return null;

  return {
    university: 'daiict',
    programme: 'btech',
    category,
    section,
    data,
  };
}

/** @deprecated use parseDaiictBtechSectionFromHtml with category='all_india'. */
export function parseDaiictBtechAllIndiaSectionFromHtml(
  html: string,
  section: DaiictBtechSectionKey,
): DaiictBtechSectionPayload | null {
  return parseDaiictBtechSectionFromHtml(html, 'all_india', section);
}

export function normalizeDaiictCategoryParam(
  raw: string | undefined,
): DaiictBtechCategory | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/-/g, '_');
  return isCategory(key) ? key : null;
}

export function normalizeDaiictSectionParam(
  raw: string | undefined,
  category: DaiictBtechCategory,
): DaiictBtechSectionKey | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/-/g, '_');
  const allowed = listDaiictSectionKeys(category);
  return (allowed as string[]).includes(key) ? (key as DaiictBtechSectionKey) : null;
}

export async function getDaiictBtechSection(
  category: DaiictBtechCategory,
  section: DaiictBtechSectionKey,
): Promise<DaiictBtechSectionPayload | null> {
  try {
    const html = await fetchDaiictBtechHtml(category);
    return parseDaiictBtechSectionFromHtml(html, category, section);
  } catch (error) {
    console.error(`DAIICT B.Tech ${category} scrape failed:`, error);
    return null;
  }
}

/** @deprecated use getDaiictBtechSection('all_india', section). */
export async function getDaiictBtechAllIndiaSection(
  section: DaiictBtechSectionKey,
): Promise<DaiictBtechSectionPayload | null> {
  return getDaiictBtechSection('all_india', section);
}
