export const LDCE_UG_PROGRAMS_URL = 'https://ldce.ac.in/admissions/ug-programs';

export type LdceUgProgramRow = {
  serial: number;
  name: string;
  courseUrl: string | null;
  periodYears: number;
  intake: number;
};

export type LdceUgInfoItem = {
  text: string;
  href: string | null;
};

export type LdceUgProgramsResponse = {
  sourceUrl: string;
  infoItems: LdceUgInfoItem[];
  programs: LdceUgProgramRow[];
  totalIntake: number;
};
