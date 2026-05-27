export interface AdmissionCalendarEntry {
  cycle: string;
  applicationOpens: string;
  applicationCloses: string;
  announcementOfDecision: string;
}

export interface AdmissionCalendarResponse {
  entries: AdmissionCalendarEntry[];
  notes: string[];
  admission_url: string;
}

export interface UgFeeEntry {
  programme: string;
  annualFee: string;
  firstSemesterFee: string;
}

export interface UgFeesResponse {
  title: string;
  currency: string;
  fees: UgFeeEntry[];
  notes: string[];
}

export const AU_ADMISSION_URL = 'https://undergraduateadmissions.ahduni.edu.in/';