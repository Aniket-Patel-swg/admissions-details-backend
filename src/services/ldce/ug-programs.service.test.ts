import { describe, expect, it } from 'vitest';

import { parseLdceUgProgramsHtml } from '../../services/ldce/ug-programs.service.js';
import { LDCE_UG_PROGRAMS_URL } from '../../types/ldce/ug-programs.types.js';

const FIXTURE_HTML = `<!DOCTYPE html><html><body>
<div class="flex flex-col md:flex-row gap-8">
  <div class="flex-1 order-2 md:order-1">
    <ul>
      <li>Admission note without link.</li>
      <li><strong>HELPLINE</strong> 079-0000</li>
      <li>For updates <a href="https://acpc.gujarat.gov.in/">ACPC</a></li>
    </ul>
    <div class="bg-white border">
      <div class="overflow-x-auto">
        <table>
          <thead><tr>
            <th>#</th><th>Name of Course</th><th>Period (Years)</th><th>Intake</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><a href="/department/ai-ml">Artificial Intelligence and Machine Learning</a></td>
              <td>4</td><td>60</td>
            </tr>
            <tr>
              <td>2</td>
              <td><a href="/dept/civil">Civil Engineering</a></td>
              <td>4</td><td>120</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
</body></html>`;

describe('parseLdceUgProgramsHtml', () => {
  it('parses programs, info list, URLs, and total intake', () => {
    const data = parseLdceUgProgramsHtml(FIXTURE_HTML);
    expect(data).not.toBeNull();
    expect(data!.sourceUrl).toBe(LDCE_UG_PROGRAMS_URL);
    expect(data!.programs).toHaveLength(2);
    expect(data!.programs[0]).toEqual({
      serial: 1,
      name: 'Artificial Intelligence and Machine Learning',
      courseUrl: 'https://ldce.ac.in/department/ai-ml',
      periodYears: 4,
      intake: 60,
    });
    expect(data!.programs[1].intake).toBe(120);
    expect(data!.totalIntake).toBe(180);
    expect(data!.infoItems).toHaveLength(3);
    expect(data!.infoItems[2].href).toBe('https://acpc.gujarat.gov.in/');
  });

  it('returns null when intake table is missing', () => {
    expect(parseLdceUgProgramsHtml('<html><body><p>empty</p></body></html>')).toBeNull();
  });
});
