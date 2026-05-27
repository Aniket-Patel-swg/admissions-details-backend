import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

import { fetchNirmaPlacementStatsHtml } from '../../clients/nirma/placement-statistics-page.client.js';
import type {
  NirmaBtechCurrentYearStats,
  NirmaBtechHigherStudiesRow,
  NirmaBtechPlacementBranchRow,
  NirmaBtechPlacementStatsPayload,
  NirmaBtechYearWisePlacement,
  NirmaBtechYearWiseSalaryRow,
} from '../../types/nirma/placement.types.js';

function cellText($: ReturnType<typeof cheerio.load>, el: AnyNode): string {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function parseCurrentYearStats(
  $: ReturnType<typeof cheerio.load>,
  card: AnyNode,
): NirmaBtechCurrentYearStats | null {
  const $card = $(card);
  const title = $card.find('.card-header a').text().replace(/\s+/g, ' ').trim();
  const body = $card.find('.card-body');

  const tables = body.find('table').toArray();
  if (tables.length < 2) return null;

  const placement_by_branch: NirmaBtechPlacementBranchRow[] = [];
  const $t1 = $(tables[0]);
  const t1Rows = $t1.find('tr').toArray();
  for (let i = 1; i < t1Rows.length; i++) {
    const cells = $(t1Rows[i]).find('td').toArray().map((c) => cellText($, c));
    if (cells.length >= 3) {
      placement_by_branch.push({
        branch: cells[0],
        placement_percent: cells[1],
        highest_salary_lpa: cells[2],
      });
    }
  }

  const higher_studies: NirmaBtechHigherStudiesRow[] = [];
  let higher_studies_total: string | null = null;
  const $t2 = $(tables[1]);
  const t2Rows = $t2.find('tr').toArray();
  for (let i = 1; i < t2Rows.length; i++) {
    const cells = $(t2Rows[i]).find('td').toArray().map((c) => cellText($, c));
    if (cells.length >= 2) {
      if (cells[0].toLowerCase().includes('total')) {
        higher_studies_total = cells[1];
      } else {
        higher_studies.push({ branch: cells[0], number_of_students: cells[1] });
      }
    }
  }

  const noteEl = body.find('p').filter((_, p) => $(p).text().includes('*')).last();
  const note = noteEl.length ? noteEl.text().replace(/\s+/g, ' ').trim() : null;

  return { title, placement_by_branch, higher_studies, higher_studies_total, note };
}

function parseYearWisePlacement(
  $: ReturnType<typeof cheerio.load>,
  card: AnyNode,
): NirmaBtechYearWisePlacement | null {
  const $card = $(card);
  const title = $card.find('.card-header a').text().replace(/\s+/g, ' ').trim();
  const body = $card.find('.card-body');

  const highest_salary_by_year: NirmaBtechYearWiseSalaryRow[] = [];
  const table = body.find('table').first();
  if (table.length) {
    const rows = table.find('tr').toArray();
    for (let i = 1; i < rows.length; i++) {
      const cells = $(rows[i]).find('td').toArray().map((c) => cellText($, c));
      if (cells.length >= 2) {
        highest_salary_by_year.push({ year: cells[0], highest_salary_lpa: cells[1] });
      }
    }
  }

  const chart_image_urls: string[] = [];
  body.find('img[src]').each((_, img) => {
    const src = $(img).attr('src');
    if (src) chart_image_urls.push(src);
  });

  return { title, highest_salary_by_year, chart_image_urls };
}

export function parseNirmaPlacementStatsFromHtml(html: string): NirmaBtechPlacementStatsPayload | null {
  const $ = cheerio.load(html);

  const marqueeEl = $('marquee').first();
  const marquee_text = marqueeEl.length
    ? marqueeEl.text().replace(/\s+/g, ' ').trim() || null
    : null;

  const cards = $('#faq .card').toArray();
  const btechCards = cards.filter((card) => {
    const headerText = $(card).find('.card-header a').text().toLowerCase();
    return headerText.includes('btech');
  });

  if (btechCards.length === 0) return null;

  let current_year: NirmaBtechCurrentYearStats | null = null;
  let year_wise: NirmaBtechYearWisePlacement | null = null;

  for (const card of btechCards) {
    const headerText = $(card).find('.card-header a').text().toLowerCase();
    if (headerText.includes('academic year') || headerText.includes('statistics for')) {
      current_year = parseCurrentYearStats($, card);
    } else if (headerText.includes('year wise')) {
      year_wise = parseYearWisePlacement($, card);
    }
  }

  return {
    college: 'nirma',
    institute: 'technology',
    page: 'btech_placement_statistics',
    marquee_text,
    sections: { current_year, year_wise },
  };
}

export async function getNirmaPlacementStats(): Promise<NirmaBtechPlacementStatsPayload | null> {
  try {
    const html = await fetchNirmaPlacementStatsHtml();
    return parseNirmaPlacementStatsFromHtml(html);
  } catch (error) {
    console.error('Nirma technology placement statistics scrape failed:', error);
    return null;
  }
}
