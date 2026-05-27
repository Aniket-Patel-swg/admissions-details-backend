import * as cheerio from 'cheerio';

import { fetchAuCalendarHtml, fetchAuFeesHtml } from '../../clients/au/admissions-page.client.js';
import {
  type AdmissionCalendarResponse,
  type UgFeesResponse,
  type UgFeeEntry,
  AU_ADMISSION_URL,
} from '../../types/au/admissions.types.js';

export async function getAuAdmissionCalendar(): Promise<AdmissionCalendarResponse | null> {
  try {
    const html = await fetchAuCalendarHtml();
    return parseCalendarFromHtml(html);
  } catch (error) {
    console.error('AU calendar scraping failed:', error);
    return null;
  }
}

export async function getAuUgFees(): Promise<UgFeesResponse | null> {
  try {
    const html = await fetchAuFeesHtml();
    return parseFeesFromHtml(html);
  } catch (error) {
    console.error('AU fees scraping failed:', error);
    return null;
  }
}

function parseCalendarFromHtml(html: string): AdmissionCalendarResponse | null {
  const $ = cheerio.load(html);

  const section = $('section#admission-calendar');
  if (!section.length) return null;

  const table = section.find('table');
  if (!table.length) return null;

  const entries = table
    .find('tbody tr')
    .map((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 4) return null;
      return {
        cycle: $(cells[0]).text().trim(),
        applicationOpens: $(cells[1]).text().trim(),
        applicationCloses: $(cells[2]).text().trim(),
        announcementOfDecision: $(cells[3]).text().trim(),
      };
    })
    .get()
    .filter(Boolean);

  const notes = section
    .find('ul li')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  
  const admission_url = AU_ADMISSION_URL;

  return { entries, notes, admission_url };
}

function parseFeesFromHtml(html: string): UgFeesResponse | null {
  const $ = cheerio.load(html);

  // The UG fees table is inside the first accordion collapse (#collapse0)
  const container = $('#collapse0');
  if (!container.length) return null;

  const titleEl = container.find('p.tab-title').first();
  const title = titleEl.length ? titleEl.text().trim() : 'Undergraduate Programmes Fee Structure';

  const table = container.find('table').first();
  if (!table.length) return null;

  const fees: UgFeeEntry[] = table
    .find('tbody tr')
    .map((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return null;
      return {
        programme: $(cells[0]).text().trim(),
        annualFee: $(cells[1]).text().trim(),
        firstSemesterFee: $(cells[2]).text().trim(),
      };
    })
    .get()
    .filter(Boolean) as UgFeeEntry[];

  const notes: string[] = [];
  container.find('p, li').each((_, el) => {
    const text = $(el).text().trim();
    if (text.startsWith('*') || text.startsWith('The Tuition') || text.startsWith('Charges')) {
      notes.push(text);
    }
  });

  return { title, currency: 'INR', fees, notes };
}
