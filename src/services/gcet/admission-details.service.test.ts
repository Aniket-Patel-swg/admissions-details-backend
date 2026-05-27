import { describe, expect, it } from 'vitest';

import { parseGcetAdmissionPages } from './admission-details.service.js';

const homeFixture = `<!DOCTYPE html><html><body>
<div class="col-md-9">
  <div class="row margin-vert-30"><div class="col-md-10"><font size="5">Admission Process</font></div></div>
  <div class="row"><div class="col-md-12">
    <p align="justify">Visit https://acpc.gujarat.gov.in/ for ACPC.</p>
    <p align="justify">Office hours 9 to 5.</p>
    <p><b>Contact Details:</b></p>
    <p>Phone: 02692-111111<br>Mobile: 9999999999<br>Email: test@gcet.ac.in</p>
  </div></div>
</div></body></html>`;

const ugFixture = `<!DOCTYPE html><html><body>
<div class="col-md-9">
  <div class="row"><div class="col-md-12"><p style="text-align:justify;">Intro one.</p></div></div>
  <div class="row">
    <div class="col-md-6">
      <table class="table table-bordered table-hover"><thead><tr><th>Sr.</th><th>Programmes</th><th>Intake</th></tr></thead><tbody>
        <tr><td>1</td><td>Chemical Engineering</td><td>60</td></tr>
        <tr><td colspan="2" align="right"><strong>Total Seats</strong></td><td><strong>60</strong></td></tr>
      </tbody></table>
    </div>
    <div class="col-md-6">
      <div class="panel panel-default"><div class="panel-body">
        <ul class="list-unstyled">
          <li><strong class="color-primary">Duration</strong><div class="clearfix"></div>4 years</li>
          <li><strong class="color-primary">Affiliated To</strong><div class="clearfix"></div>CVM University</li>
          <li><strong class="color-primary">Approved By</strong><div class="clearfix"></div>AICTE</li>
        </ul>
      </div></div>
    </div>
  </div>
</div></body></html>`;

const pgFixture = `<!DOCTYPE html><html><body>
<div class="col-md-9">
  <div class="row"><div class="col-md-12"><p style="text-align:justify;">PG intro.</p></div></div>
  <div class="row">
    <div class="col-md-6">
      <table class="table table-bordered table-hover"><tbody>
        <tr><td>1</td><td><a href="uploads/b.pdf" target="_blank">IT</a></td><td>18</td></tr>
        <tr><td colspan="2" align="right"><strong>Total Seats</strong></td><td><strong>18</strong></td></tr>
      </tbody></table>
    </div>
    <div class="col-md-6"><div class="panel panel-default"><div class="panel-body">
      <ul class="list-unstyled">
        <li><strong class="color-primary">Duration</strong><div class="clearfix"></div>2 years</li>
        <li><strong class="color-primary">Approved By</strong><div class="clearfix"></div>AICTE</li>
      </ul>
    </div></div></div>
  </div>
</div></body></html>`;

const feeFixture = `<!DOCTYPE html><html><body>
<div class="col-md-9">
  <font size="5">Fee Circulars</font>
  <table class="table"><tbody>
    <tr><td>1</td><td colspan="2"><a href="assets/data/about/fees.pdf">AY 2026-29</a></td></tr>
  </tbody></table>
</div></body></html>`;

const embedFixture = (title: string, src: string) => `<!DOCTYPE html><html><body>
<div class="col-md-9">
  <font size="5">${title}</font>
  <div class="blog-item"><embed src="${src}" width="1000"></div>
</div></body></html>`;

describe('parseGcetAdmissionPages', () => {
  it('parses bundled fixtures', () => {
    const out = parseGcetAdmissionPages({
      home: homeFixture,
      ug: ugFixture,
      pg: pgFixture,
      feeCirculars: feeFixture,
      cutoff: embedFixture('Cutoff 2024', 'uploads/cutoff/x.pdf'),
      admissionGuide: embedFixture('Guide', 'uploads/admission/Booklet.pdf'),
      scholarship: embedFixture('Scholarships', 'uploads/scholarship/S.pdf'),
    });
    expect(out).not.toBeNull();
    expect(out!.admissionProcess.officialProcessUrl).toBe('https://acpc.gujarat.gov.in/');
    expect(out!.contact.phone).toBe('02692-111111');
    expect(out!.contact.mobile).toBe('9999999999');
    expect(out!.contact.email).toBe('test@gcet.ac.in');
    expect(out!.ug.programs).toHaveLength(1);
    expect(out!.ug.totalSeats).toBe('60');
    expect(out!.ug.courseDetail.duration).toBe('4 years');
    expect(out!.pg.programs[0].brochureUrl).toContain('uploads/b.pdf');
    expect(out!.feeCirculars.feeOrders[0].pdfUrl).toContain('fees.pdf');
    expect(out!.cutoff.documentUrl).toContain('x.pdf');
    expect(out!.importantDates.acpcWebsiteUrl).toContain('acpc.gujarat.gov.in');
  });

  it('returns null when home has no main column', () => {
    expect(parseGcetAdmissionPages({ home: '<html></html>', ug: ugFixture, pg: pgFixture, feeCirculars: feeFixture, cutoff: '', admissionGuide: '', scholarship: '' })).toBeNull();
  });
});
