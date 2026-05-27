import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDduPayload,
  parseDduAdmissionLinksFromHtml,
} from '../../services/ddu/btech-admissions.service.js';

const FIXTURE = `<!DOCTYPE html><html><body><div class="container">
<div class="borderBlack cursor" onClick="window.open('pdf/FoT/Admission2026-27/Admission Seat Matrix 2026.pdf');">
  <table><tr><td class="bodytextOrgSm2 lineheight20">General Information</td></tr></table>
</div>
<div class="borderBOrg"><div class="orgBg">Admission for B.Tech. Computer Engineering - 2026-27</div></div>
<div class="row"><div class="borderBlack cursor" onClick="window.open('https://forms.gle/Ut3n7Ltmq5T97yJG9');">
  <table><tr><td class="bodytextOrgSm2">B.Tech. Computer Engineering (Management Quota : MQ) Application Form</td></tr></table>
</div></div>
</div></body></html>`;

describe('parseDduAdmissionLinksFromHtml', () => {
  it('extracts titles, absolute URLs, kinds, and section headings', () => {
    const links = parseDduAdmissionLinksFromHtml(FIXTURE);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({
      title: 'General Information',
      kind: 'pdf',
      section: null,
    });
    expect(links[0].url).toBe(
      'https://www.ddu.ac.in/pdf/FoT/Admission2026-27/Admission%20Seat%20Matrix%202026.pdf',
    );
    expect(links[1]).toMatchObject({
      title: 'B.Tech. Computer Engineering (Management Quota : MQ) Application Form',
      kind: 'google_form',
      section: 'Admission for B.Tech. Computer Engineering - 2026-27',
    });
  });
});

describe('buildDduPayload', () => {
  const links = parseDduAdmissionLinksFromHtml(FIXTURE);

  it('management includes MQ form and general PDFs', () => {
    const p = buildDduPayload(links, 'management');
    expect(p.category).toBe('management');
    expect(p.notes).toBeNull();
    expect(p.links.map((x) => x.title)).toEqual(
      expect.arrayContaining([
        'General Information',
        'B.Tech. Computer Engineering (Management Quota : MQ) Application Form',
      ]),
    );
  });

  it('jee includes only public documents from this page', () => {
    const p = buildDduPayload(links, 'jee');
    expect(p.links).toHaveLength(1);
    expect(p.links[0].title).toBe('General Information');
    expect(p.notes).toContain('JEE');
  });

  it('acpc mirrors document-only scope', () => {
    const p = buildDduPayload(links, 'acpc');
    expect(p.links).toHaveLength(1);
    expect(p.links[0].title).toBe('General Information');
    expect(p.notes).toContain('ACPC');
  });
});
