import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { Cheerio, CheerioAPI } from 'cheerio';

import { fetchAllGcetAdmissionHtml, GCET_ADMISSION_PATHS } from '../../clients/gcet/admissions-page.client.js';
import {
  GCET_BASE_URL,
  type GcetAdmissionDetailsResponse,
  type GcetAdmissionProcess,
  type GcetContactDetails,
  type GcetCourseDetail,
  type GcetEmbeddedDocument,
  type GcetFeeCirculars,
  type GcetFeeOrderLink,
  type GcetImportantDatesNote,
  type GcetPgPrograms,
  type GcetProgramRow,
  type GcetUgPrograms,
} from '../../types/gcet/admissions.types.js';

function resolveGcetUrl(href: string | undefined): string | null {
  if (!href?.trim()) return null;
  const t = href.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return new URL(t.replace(/^\//, ''), GCET_BASE_URL).href;
}

function sectionTitleFromMain($main: Cheerio<AnyNode>): string {
  const t = $main.find('font[size="5"]').first().text().trim();
  return t || 'Admission';
}

function parseCourseDetail($: CheerioAPI, $main: Cheerio<AnyNode>): GcetCourseDetail {
  const detail: GcetCourseDetail = {
    duration: null,
    affiliatedTo: null,
    approvedBy: null,
  };
  $main.find('.panel-body li').each((_, li) => {
    const $li = $(li);
    const label = $li.find('strong').first().text().trim().toLowerCase();
    const clone = $li.clone();
    clone.find('strong').remove();
    clone.find('div.clearfix').remove();
    const value = clone.text().replace(/\s+/g, ' ').trim();
    if (label.startsWith('duration')) detail.duration = value || null;
    else if (label.startsWith('affiliated')) detail.affiliatedTo = value || null;
    else if (label.startsWith('approved')) detail.approvedBy = value || null;
  });
  return detail;
}

function parseProgramTable($: CheerioAPI, $main: Cheerio<AnyNode>): {
  programs: GcetProgramRow[];
  totalSeats: string | null;
} {
  const programs: GcetProgramRow[] = [];
  let totalSeats: string | null = null;
  const $table = $main.find('table.table').first();
  $table.find('tbody tr').each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td');
    if (cells.length < 2) return;

    if (cells.length === 2) {
      const $c0 = $(cells[0]);
      const $c1 = $(cells[1]);
      if ($c0.attr('colspan') && /total\s*seats/i.test($c0.text())) {
        totalSeats = $c1.text().replace(/\s+/g, ' ').trim() || null;
        return;
      }
      const $a = $c1.find('a[href]').first().length ? $c1.find('a[href]').first() : $c0.find('a[href]').first();
      if ($a.length) {
        const serial = $c0.text().trim();
        const label = $a.text().replace(/\s+/g, ' ').trim();
        const href = $a.attr('href');
        if (label && href && serial) {
          programs.push({
            serial,
            programme: label,
            annualIntake: '—',
            brochureUrl: resolveGcetUrl(href) ?? undefined,
          });
        }
      }
      return;
    }

    if (cells.length >= 3) {
      const serial = $(cells[0]).text().trim();
      const $nameCell = $(cells[1]);
      const link = $nameCell.find('a[href]').first();
      const programme = (link.length ? link.text() : $nameCell.text()).replace(/\s+/g, ' ').trim();
      const annualIntake = $(cells[2]).text().trim();
      const brochureUrl = link.attr('href') ? resolveGcetUrl(link.attr('href')) ?? undefined : undefined;
      if (/total/i.test(programme)) {
        totalSeats = annualIntake || null;
        return;
      }
      if (serial && programme) {
        programs.push({ serial, programme, annualIntake, ...(brochureUrl ? { brochureUrl } : {}) });
      }
    }
  });

  const $totalRow = $table.find('td[colspan]').filter((_, el) => /total seats/i.test($(el).text())).closest('tr');
  if ($totalRow.length) {
    const tds = $totalRow.find('td');
    totalSeats = $(tds[tds.length - 1]).text().replace(/\s+/g, ' ').trim() || totalSeats;
  }

  return { programs, totalSeats };
}

function parseIntroParagraphs($: CheerioAPI, $main: Cheerio<AnyNode>): string[] {
  const firstCol12 = $main.children('.row').find('.col-md-12').first();
  return firstCol12
    .find('p')
    .map((_, p) => $(p).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean);
}

function parseHome($: CheerioAPI): {
  process: GcetAdmissionProcess;
  contact: GcetContactDetails;
} {
  const $main = $('div.col-md-9').first();
  const sectionTitle = sectionTitleFromMain($main);
  const paragraphs = $main
    .find('.col-md-12')
    .first()
    .find('p')
    .map((_, p) => $(p).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean);

  let officeHoursNote: string | null = null;
  let officialProcessUrl: string | null = null;
  for (const text of paragraphs) {
    const acpc = text.match(/(https?:\/\/acpc\.gujarat\.gov\.in[^\s)]*)/i);
    if (acpc) officialProcessUrl = acpc[1].replace(/\)+$/, '');
    if (/office hours/i.test(text)) officeHoursNote = text;
  }

  const contactBlock = paragraphs.find((t) => /Phone:\s*\d/.test(t));
  const contact: GcetContactDetails = { phone: null, mobile: null, email: null };
  if (contactBlock) {
    const phoneM = contactBlock.match(/Phone:\s*([^\nMobile<]+)/i);
    const mobM = contactBlock.match(/Mobile:\s*([^\nEmail<]+)/i);
    const emailM = contactBlock.match(/Email:\s*(\S+)/i);
    contact.phone = phoneM?.[1]?.trim() ?? null;
    contact.mobile = mobM?.[1]?.trim() ?? null;
    contact.email = emailM?.[1]?.trim() ?? null;
  }

  return {
    process: {
      sectionTitle,
      paragraphs,
      officeHoursNote,
      officialProcessUrl,
    },
    contact,
  };
}

function parseUg(html: string): GcetUgPrograms {
  const $ = cheerio.load(html);
  const $main = $('div.col-md-9').first();
  return {
    sectionTitle: sectionTitleFromMain($main),
    introParagraphs: parseIntroParagraphs($, $main),
    ...parseProgramTable($, $main),
    courseDetail: parseCourseDetail($, $main),
  };
}

function parsePg(html: string): GcetPgPrograms {
  const $ = cheerio.load(html);
  const $main = $('div.col-md-9').first();
  return {
    sectionTitle: sectionTitleFromMain($main),
    introParagraphs: parseIntroParagraphs($, $main),
    ...parseProgramTable($, $main),
    courseDetail: parseCourseDetail($, $main),
  };
}

function parseFeeCirculars(html: string): GcetFeeCirculars {
  const $ = cheerio.load(html);
  const $main = $('div.col-md-9').first();
  const feeOrders: GcetFeeOrderLink[] = [];
  $main.find('table tbody a[href]').each((_, a) => {
    const $a = $(a);
    const href = $a.attr('href');
    const label = $a.text().replace(/\s+/g, ' ').trim();
    const pdfUrl = resolveGcetUrl(href);
    if (label && pdfUrl && /\.pdf$/i.test(pdfUrl)) {
      feeOrders.push({ label, pdfUrl });
    }
  });
  return {
    sectionTitle: sectionTitleFromMain($main),
    feeOrders,
  };
}

function parseEmbeddedDoc(html: string): GcetEmbeddedDocument {
  const $ = cheerio.load(html);
  const $main = $('div.col-md-9').first();
  const src = $main.find('embed[src]').first().attr('src') ?? $main.find('iframe[src]').first().attr('src');
  return {
    sectionTitle: sectionTitleFromMain($main),
    documentUrl: resolveGcetUrl(src ?? undefined),
  };
}

export function parseGcetAdmissionPages(pages: {
  home: string;
  ug: string;
  pg: string;
  feeCirculars: string;
  cutoff: string;
  admissionGuide: string;
  scholarship: string;
}): GcetAdmissionDetailsResponse | null {
  const $home = cheerio.load(pages.home);
  if (!$home('div.col-md-9').length) return null;

  const { process: admissionProcess, contact } = parseHome($home);
  const ug = parseUg(pages.ug);
  const pg = parsePg(pages.pg);
  const feeCirculars = parseFeeCirculars(pages.feeCirculars);
  const cutoff = parseEmbeddedDoc(pages.cutoff);
  const admissionGuide = parseEmbeddedDoc(pages.admissionGuide);
  const scholarship = parseEmbeddedDoc(pages.scholarship);

  const importantDates: GcetImportantDatesNote = {
    summary:
      'GCET admission pages do not list a single last application date; UG/PG timelines and deadlines are set by ACPC.',
    acpcWebsiteUrl: admissionProcess.officialProcessUrl ?? 'https://acpc.gujarat.gov.in/',
  };

  const sourcePages = Object.fromEntries(
    Object.entries(GCET_ADMISSION_PATHS).map(([k, path]) => [k, new URL(path, GCET_BASE_URL).href]),
  ) as Record<string, string>;

  return {
    institute: 'G H Patel College of Engineering & Technology (CVM University)',
    sourcePages,
    admissionProcess,
    contact,
    importantDates,
    ug,
    pg,
    feeCirculars,
    cutoff,
    admissionGuide,
    scholarship,
  };
}

export async function getGcetAdmissionDetails(): Promise<GcetAdmissionDetailsResponse | null> {
  try {
    const pages = await fetchAllGcetAdmissionHtml();
    return parseGcetAdmissionPages(pages);
  } catch (error) {
    console.error('GCET admission scrape failed:', error);
    return null;
  }
}
