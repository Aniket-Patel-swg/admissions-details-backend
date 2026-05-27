import * as cheerio from 'cheerio';
import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';

import { fetchNirmaBtechHtml } from '../../clients/nirma/admissions-page.client.js';
import type {
  EligibilityContentItem,
  EligibilityData,
  FeeCategoryBlock,
  FeeLineItem,
  FeeStructureData,
  ForInquiriesData,
  HigherStudiesByBranchRow,
  HowToApplyData,
  ImportantInformationData,
  IntakeData,
  IntakeProgrammeRow,
  NirmaBtechSectionData,
  NirmaBtechSectionKey,
  NirmaBtechSectionPayload,
  NirmaCategoryPair,
  PlacementByBranchRow,
  PlacementStatisticsData,
  ScholarshipBlockData,
  ScholarshipTableData,
  ScholarshipsData,
  SelectionCategoryData,
  SelectionCriteriaData,
} from '../../types/nirma/btech.types.js';

/** Maps URL path segment → Bootstrap tab panel id (Important Information → Important Dates tab). */
export const NIRMA_BTECH_SECTION_TAB_ID: Record<NirmaBtechSectionKey, string> = {
  important_information: 'v-pills-impdt',
  intake: 'v-pills-intake',
  eligibility_criteria: 'v-pills-elgbl',
  selection_criteria: 'v-pills-selec',
  placement_statistics: 'v-pills-placement',
  fee_structure: 'v-pills-fee',
  scholarships: 'v-pills-scholar',
  how_to_apply: 'v-pills-apply',
  for_inquiries: 'v-pills-inquiry',
};

export const NIRMA_BTECH_SECTION_KEYS = Object.keys(NIRMA_BTECH_SECTION_TAB_ID) as NirmaBtechSectionKey[];

function isNirmaBtechSectionKey(s: string): s is NirmaBtechSectionKey {
  return s in NIRMA_BTECH_SECTION_TAB_ID;
}

interface ParsedTable {
  caption: string | null;
  headers: string[];
  rows: string[][];
}

function cellText($: ReturnType<typeof cheerio.load>, el: AnyNode): string {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function parseTable($: ReturnType<typeof cheerio.load>, table: AnyNode): ParsedTable {
  const $table = $(table);
  const caption = $table.find('caption').first().text().replace(/\s+/g, ' ').trim() || null;

  let headers: string[] = [];
  const thead = $table.find('thead').first();
  if (thead.length) {
    const rowsInThead = thead.find('tr');
    const headerCells =
      rowsInThead.length > 0
        ? rowsInThead.last().find('th,td').toArray()
        : thead.find('th,td').toArray();
    headers = headerCells.map((c) => cellText($, c)).filter((h) => h.length > 0);
  }

  const rows: string[][] = [];
  $table.find('tbody tr').each((_, tr) => {
    const cells = $(tr)
      .find('th,td')
      .toArray()
      .map((c) => cellText($, c));
    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  });

  if (headers.length === 0 && rows.length > 0) {
    headers = rows[0] ?? [];
    rows.shift();
  }

  return { caption, headers, rows };
}

type Pane = Cheerio<AnyNode>;

function normLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[()]/g, '')
    .trim();
}

/** Detect allotment/payment round 1–4 from row label (check IV before III before II before I). */
function parseRoundNumber(labelRaw: string): 1 | 2 | 3 | 4 | null {
  const u = labelRaw.toUpperCase().replace(/[–—]/g, '-');
  if (!u.includes('ROUND')) return null;
  if (/\bROUND\s*-?\s*IV\b/.test(u) || u.includes('ROUND - IV')) return 4;
  if (/\bROUND\s*-?\s*III\b/.test(u) || u.includes('ROUND - III')) return 3;
  if (/\bROUND\s*-?\s*II\b/.test(u) || u.includes('ROUND - II')) return 2;
  if (/\bROUND\s*-?\s*I\b/.test(u) || u.includes('ROUND - I')) return 1;
  return null;
}

function emptyPair(): NirmaCategoryPair {
  return { all_india_category: '', nri_nri_sponsored_category: '' };
}

function emptyImportantInformation(): ImportantInformationData {
  return {
    online_application_start_date: '',
    last_date_for_online_application: '',
    last_date_to_upload_pending_documents_modify_branch_preferences: '',
    declaration_of_provisional_merit_list: '',
    date_of_online_allotment_round_1: emptyPair(),
    last_date_of_payment_online_round_1: emptyPair(),
    date_of_online_allotment_round_2: emptyPair(),
    last_date_of_payment_online_round_2: emptyPair(),
    date_of_online_allotment_round_3: emptyPair(),
    last_date_of_payment_online_round_3: emptyPair(),
    date_of_online_allotment_round_4: emptyPair(),
    last_date_of_payment_online_round_4: emptyPair(),
    last_date_for_cancellation_through_online_module: '',
    commencement_of_academic_term: '',
    in_person_document_verification: '',
    schedule_note: null,
  };
}

function buildImportantInformation(tables: ParsedTable[], $: ReturnType<typeof cheerio.load>, pane: Pane): ImportantInformationData {
  const out = emptyImportantInformation();
  const table = tables[0];
  if (!table) return out;

  for (const row of table.rows) {
    if (row.length < 2) continue;
    const labelRaw = row[0] ?? '';
    const label = normLabel(labelRaw);
    const v1 = row[1] ?? '';
    const v2 = row[2] ?? '';
    const pair = (): NirmaCategoryPair => ({
      all_india_category: v1,
      nri_nri_sponsored_category: v2 || v1,
    });

    if (row.length === 2) {
      if (label.includes('online application starts')) out.online_application_start_date = v1;
      else if (label.includes('last date for online application') && !label.includes('extended'))
        out.last_date_for_online_application = v1;
      else if (label.includes('last date to upload') || label.includes('pending documents'))
        out.last_date_to_upload_pending_documents_modify_branch_preferences = v1;
      else if (label.includes('declaration of provisional merit')) out.declaration_of_provisional_merit_list = v1;
      else if (label.includes('cancellation') && label.includes('online'))
        out.last_date_for_cancellation_through_online_module = v1;
      else if (label.includes('commencement of academic')) out.commencement_of_academic_term = v1;
      else if (label.includes('in-person document') || label.includes('in person document'))
        out.in_person_document_verification = v1;
      continue;
    }

    if (row.length >= 3) {
      if (label.includes('online application starts')) out.online_application_start_date = v2 ? `${v1} / ${v2}` : v1;
      else if (label.includes('last date for online application') && !label.includes('extended'))
        out.last_date_for_online_application = v2 ? `${v1} / ${v2}` : v1;
      else if (label.includes('last date to upload') || label.includes('pending documents'))
        out.last_date_to_upload_pending_documents_modify_branch_preferences = v2 ? `${v1} / ${v2}` : v1;
      else if (label.includes('declaration of provisional merit'))
        out.declaration_of_provisional_merit_list = v2 ? `${v1} / ${v2}` : v1;
      else if (label.includes('allotment') && !label.includes('payment')) {
        const r = parseRoundNumber(labelRaw);
        if (r === 1) out.date_of_online_allotment_round_1 = pair();
        else if (r === 2) out.date_of_online_allotment_round_2 = pair();
        else if (r === 3) out.date_of_online_allotment_round_3 = pair();
        else if (r === 4) out.date_of_online_allotment_round_4 = pair();
      } else if (label.includes('payment') && label.includes('online')) {
        const r = parseRoundNumber(labelRaw);
        if (r === 1) out.last_date_of_payment_online_round_1 = pair();
        else if (r === 2) out.last_date_of_payment_online_round_2 = pair();
        else if (r === 3) out.last_date_of_payment_online_round_3 = pair();
        else if (r === 4) out.last_date_of_payment_online_round_4 = pair();
      } else if (label.includes('cancellation') && label.includes('online'))
        out.last_date_for_cancellation_through_online_module = v2 ? `${v1} / ${v2}` : v1;
      else if (label.includes('commencement of academic'))
        out.commencement_of_academic_term = v2 ? `${v1} / ${v2}` : v1;
      else if (label.includes('in-person document') || label.includes('in person document'))
        out.in_person_document_verification = v2 ? `${v1} / ${v2}` : v1;
    }
  }

  const noteText = pane
    .find('p')
    .filter((_, p) => $(p).text().includes('Tentative') || $(p).text().includes('tentative'))
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  out.schedule_note = noteText || null;

  return out;
}

function buildIntake(tables: ParsedTable[], $: ReturnType<typeof cheerio.load>, pane: Pane): IntakeData {
  const programmes: IntakeProgrammeRow[] = [];
  let totals: IntakeProgrammeRow | null = null;
  const table = tables[0];
  if (table && table.headers.length >= 4) {
    for (const row of table.rows) {
      if (row.length < 5) continue;
      const rec: IntakeProgrammeRow = {
        programme_name: row[0] ?? '',
        state_quota_seats_acpc: row[1] ?? '',
        all_india_seats: row[2] ?? '',
        nri_nri_sponsored_seats: row[3] ?? '',
        total_seats: row[4] ?? '',
      };
      if (normLabel(rec.programme_name).includes('total')) totals = rec;
      else programmes.push(rec);
    }
  }
  const note =
    pane
      .find('p')
      .filter((_, p) => $(p).text().includes('vary') || $(p).text().includes('ACPC'))
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim() || null;
  return { programmes, totals, seats_may_vary_note: note };
}

function buildEligibility($: ReturnType<typeof cheerio.load>, pane: Pane): EligibilityData {
  const content: EligibilityContentItem[] = [];
  pane.find('p, ul').each((_, el) => {
    if ($(el).closest('table').length) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'p') {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text) content.push({ kind: 'paragraph', text });
    } else if (tag === 'ul') {
      const items = $(el)
        .find('> li')
        .toArray()
        .map((li) => $(li).text().replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (items.length) content.push({ kind: 'list', items });
    }
  });
  return { content };
}

function collectNestedListItems($: ReturnType<typeof cheerio.load>, $ul: Cheerio<AnyNode>): string[] {
  const out: string[] = [];
  $ul.find('> li').each((_, li) => {
    const $li = $(li);
    const directText = $li
      .clone()
      .children('ul, ol')
      .remove()
      .end()
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    if (directText) out.push(directText);
    $li.children('ul').each((__, sub) => {
      out.push(...collectNestedListItems($, $(sub)));
    });
  });
  return out;
}

function buildSelectionCriteria($: ReturnType<typeof cheerio.load>, pane: Pane): SelectionCriteriaData {
  const categories: SelectionCategoryData[] = [];
  const $ol = pane.find('ol').first();
  let current: SelectionCategoryData | null = null;

  const flush = (cat: SelectionCategoryData | null): void => {
    if (cat === null) return;
    if (cat.points.length > 0) categories.push(cat);
  };

  $ol.children().each((_, child) => {
    const $c = $(child);
    const tag = child.tagName.toLowerCase();
    if (tag === 'li' && $c.hasClass('prog-slct-cri')) {
      flush(current);
      current = { title: $c.text().replace(/\s+/g, ' ').trim(), points: [] };
    } else if (tag === 'ul' && current !== null) {
      current.points.push(...collectNestedListItems($, $c));
    }
  });
  flush(current);
  return { categories };
}

function buildPlacementStatistics(
  tables: ParsedTable[],
  $: ReturnType<typeof cheerio.load>,
  pane: Pane,
): PlacementStatisticsData {
  let placement_heading: string | null = null;
  let higher_studies_heading: string | null = null;
  const placement_by_branch: PlacementByBranchRow[] = [];
  const higher_studies_by_branch: HigherStudiesByBranchRow[] = [];

  const headings = pane
    .find('p strong')
    .toArray()
    .map((e) => $(e).text().replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (headings[0]) placement_heading = headings[0];
  if (headings[1]) higher_studies_heading = headings[1];

  if (tables[0]?.headers.length >= 3) {
    for (const row of tables[0].rows) {
      if (row.length < 3) continue;
      placement_by_branch.push({
        branch: row[0] ?? '',
        placement_percent: row[1] ?? '',
        highest_salary_lpa: row[2] ?? '',
      });
    }
  }
  if (tables[1]?.headers.length >= 2) {
    for (const row of tables[1].rows) {
      if (row.length < 2) continue;
      higher_studies_by_branch.push({
        branch: row[0] ?? '',
        number_of_students: row[1] ?? '',
      });
    }
  }

  return {
    placement_heading,
    placement_by_branch,
    higher_studies_heading,
    higher_studies_by_branch,
  };
}

function slugHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_');
}

function buildFeeStructure(tables: ParsedTable[]): FeeStructureData {
  const categories: FeeCategoryBlock[] = [];
  for (const t of tables) {
    const rows: FeeLineItem[] = [];
    for (const row of t.rows) {
      if (row.every((c) => !String(c).trim())) continue;
      if (row.length >= 3) {
        const c0 = (row[0] ?? '').trim();
        const sn = /^\d+\.?$/.test(c0) ? c0.replace(/\.$/, '') : null;
        rows.push({
          serial_number: sn,
          description: (row[1] ?? '').replace(/\s+/g, ' ').trim(),
          amount: (row[2] ?? '').replace(/\s+/g, ' ').trim(),
        });
      } else if (row.length === 2) {
        rows.push({
          serial_number: null,
          description: (row[0] ?? '').replace(/\s+/g, ' ').trim(),
          amount: (row[1] ?? '').replace(/\s+/g, ' ').trim(),
        });
      }
    }
    categories.push({ category_caption: t.caption, rows });
  }
  return { categories };
}

function tableToScholarshipTable($: ReturnType<typeof cheerio.load>, table: AnyNode): ScholarshipTableData | null {
  const t = parseTable($, table);
  if (!t.headers.length && !t.rows.length) return null;
  const column_keys = t.headers.length ? t.headers.map(slugHeader) : t.rows[0]?.map((_, i) => `column_${i}`) ?? [];
  const rows: Record<string, string>[] = [];
  for (const row of t.rows) {
    const obj: Record<string, string> = {};
    column_keys.forEach((key, i) => {
      obj[key] = row[i] ?? '';
    });
    rows.push(obj);
  }
  return { caption: t.caption, column_keys, rows };
}

function buildScholarships($: ReturnType<typeof cheerio.load>, pane: Pane): ScholarshipsData {
  const intro = pane.find('p').first().text().replace(/\s+/g, ' ').trim() || null;
  const blocks: ScholarshipBlockData[] = [];
  let cur: ScholarshipBlockData = { section_title: null, tables: [] };

  pane.find('h5.scholar-title, table').each((_, el) => {
    if (el.tagName.toLowerCase() === 'h5') {
      if (cur.tables.length) blocks.push(cur);
      cur = { section_title: $(el).text().replace(/\s+/g, ' ').trim(), tables: [] };
    } else {
      const st = tableToScholarshipTable($, el);
      if (st) cur.tables.push(st);
    }
  });
  if (cur.tables.length) blocks.push(cur);

  const notes_and_policy: string[] = [];
  pane.find('p.prog-content, ol.prog-content').each((_, el) => {
    if ($(el).closest('table').length) return;
    if (el.tagName.toLowerCase() === 'p') {
      const tx = $(el).text().replace(/\s+/g, ' ').trim();
      if (tx && tx !== intro) notes_and_policy.push(tx);
    } else {
      $(el)
        .find('li')
        .each((__, li) => {
          const tx = $(li).text().replace(/\s+/g, ' ').trim();
          if (tx) notes_and_policy.push(tx);
        });
    }
  });

  return { introduction: intro, blocks, notes_and_policy };
}

function buildHowToApply($: ReturnType<typeof cheerio.load>, pane: Pane): HowToApplyData {
  let instruction_for_online_application_pdf_url: string | null = null;
  let guideline_online_allotment_pdf_url: string | null = null;

  pane.find('a[href]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    const ctx = $(a).closest('p').text().toUpperCase();
    if (ctx.includes('INSTRUCTION') && href) instruction_for_online_application_pdf_url = href;
    if (ctx.includes('GUIDELINE') && href) guideline_online_allotment_pdf_url = href;
  });

  let application_fee_within_gujarat_in_inr: number | null = null;
  let application_fee_outside_gujarat_in_inr: number | null = null;
  const additional_notes: string[] = [];

  pane.find('ul.prog-content > li').each((_, li) => {
    const t = $(li).text().replace(/\s+/g, ' ').trim();
    const m350 = t.match(/Rs\.\s*350|₹\s*350|350\/-/);
    const m1200 = t.match(/Rs\.\s*1200|₹\s*1200|1200\/-/);
    if (m350 && t.toLowerCase().includes('gujarat')) {
      application_fee_within_gujarat_in_inr = 350;
      additional_notes.push(t);
    } else if (m1200 && t.toLowerCase().includes('outside')) {
      application_fee_outside_gujarat_in_inr = 1200;
      additional_notes.push(t);
    }
  });

  const para = pane.find('p.prog-content').first().text().replace(/\s+/g, ' ').trim();
  if (para && !additional_notes.some((n) => n.includes('350') || n.includes('1200'))) {
    additional_notes.unshift(para);
  }

  return {
    instruction_for_online_application_pdf_url,
    guideline_online_allotment_pdf_url,
    application_fee_within_gujarat_in_inr,
    application_fee_outside_gujarat_in_inr,
    additional_notes,
  };
}

function buildForInquiries(tables: ParsedTable[]): ForInquiriesData {
  const out: ForInquiriesData = {
    admission_office_address: '',
    phone_numbers: '',
    email: null,
    office_timings: '',
    more_information_url: null,
  };
  const t = tables[0];
  if (!t) return out;

  for (const row of t.rows) {
    if (row.length < 2) continue;
    const key = normLabel(row[0]);
    const val = row[1] ?? '';
    const hrefMatch = val.match(/mailto:([^">\s]+)/i);
    if (key.includes('admission office')) out.admission_office_address = val.replace(/\s+/g, ' ').trim();
    else if (key.includes('phone')) out.phone_numbers = val.replace(/\s+/g, ' ').trim();
    else if (key.includes('email')) {
      const $wrap = cheerio.load(`<div>${val}</div>`);
      out.email =
        $wrap('a')
          .attr('href')
          ?.replace(/^mailto:\s*/i, '')
          .trim() ??
        hrefMatch?.[1]?.trim() ??
        val.replace(/\s+/g, ' ').trim();
    } else if (key.includes('timing')) out.office_timings = val.replace(/\s+/g, ' ').trim();
    else if (key.includes('more information')) {
      const $wrap = cheerio.load(`<div>${val}</div>`);
      out.more_information_url = $wrap('a').attr('href') ?? null;
    }
  }
  return out;
}

function buildSectionData(
  section: NirmaBtechSectionKey,
  tables: ParsedTable[],
  $: ReturnType<typeof cheerio.load>,
  pane: Pane,
): NirmaBtechSectionData | null {
  switch (section) {
    case 'important_information':
      return buildImportantInformation(tables, $, pane);
    case 'intake':
      return buildIntake(tables, $, pane);
    case 'eligibility_criteria':
      return buildEligibility($, pane);
    case 'selection_criteria':
      return buildSelectionCriteria($, pane);
    case 'placement_statistics':
      return buildPlacementStatistics(tables, $, pane);
    case 'fee_structure':
      return buildFeeStructure(tables);
    case 'scholarships':
      return buildScholarships($, pane);
    case 'how_to_apply':
      return buildHowToApply($, pane);
    case 'for_inquiries':
      return buildForInquiries(tables);
    default:
      return null;
  }
}

export function parseNirmaBtechSectionFromHtml(
  html: string,
  section: NirmaBtechSectionKey,
): NirmaBtechSectionPayload | null {
  const $ = cheerio.load(html);
  const id = NIRMA_BTECH_SECTION_TAB_ID[section];
  const pane = $(`#${id}`).first();
  if (!pane.length) return null;

  const tables = pane
    .find('table')
    .toArray()
    .map((t) => parseTable($, t))
    .filter((t) => t.rows.length > 0 || t.headers.length > 0);

  const data = buildSectionData(section, tables, $, pane);
  if (data === null) return null;

  return {
    university: 'nirma',
    programme: 'btech',
    section,
    data,
  };
}

export function normalizeNirmaBtechSectionParam(raw: string | undefined): NirmaBtechSectionKey | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/-/g, '_');
  if (isNirmaBtechSectionKey(key)) return key;
  return null;
}

export async function getNirmaBtechSection(section: NirmaBtechSectionKey): Promise<NirmaBtechSectionPayload | null> {
  try {
    const html = await fetchNirmaBtechHtml();
    return parseNirmaBtechSectionFromHtml(html, section);
  } catch (error) {
    console.error('Nirma B.Tech scrape failed:', error);
    return null;
  }
}
