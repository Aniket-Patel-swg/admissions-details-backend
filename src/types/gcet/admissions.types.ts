/** Public admission bundle scraped from https://www.gcet.ac.in/ admission pages. */

export const GCET_BASE_URL = 'https://www.gcet.ac.in/';

export interface GcetContactDetails {
  phone: string | null;
  mobile: string | null;
  email: string | null;
}

export interface GcetAdmissionProcess {
  sectionTitle: string;
  paragraphs: string[];
  officeHoursNote: string | null;
  officialProcessUrl: string | null;
}

export interface GcetProgramRow {
  serial: string;
  programme: string;
  annualIntake: string;
  brochureUrl?: string;
}

export interface GcetCourseDetail {
  duration: string | null;
  affiliatedTo: string | null;
  approvedBy: string | null;
}

export interface GcetUgPrograms {
  sectionTitle: string;
  introParagraphs: string[];
  programs: GcetProgramRow[];
  totalSeats: string | null;
  courseDetail: GcetCourseDetail;
}

export interface GcetPgPrograms {
  sectionTitle: string;
  introParagraphs: string[];
  programs: GcetProgramRow[];
  totalSeats: string | null;
  courseDetail: GcetCourseDetail;
}

export interface GcetFeeOrderLink {
  label: string;
  pdfUrl: string;
}

export interface GcetFeeCirculars {
  sectionTitle: string;
  feeOrders: GcetFeeOrderLink[];
}

export interface GcetEmbeddedDocument {
  sectionTitle: string;
  /** Absolute URL to PDF or other resource referenced by the page. */
  documentUrl: string | null;
}

export interface GcetImportantDatesNote {
  /** GCET pages do not publish a single "last application date"; ACPC governs timelines. */
  summary: string;
  acpcWebsiteUrl: string;
}

export interface GcetAdmissionDetailsResponse {
  institute: string;
  sourcePages: Record<string, string>;
  admissionProcess: GcetAdmissionProcess;
  contact: GcetContactDetails;
  importantDates: GcetImportantDatesNote;
  ug: GcetUgPrograms;
  pg: GcetPgPrograms;
  feeCirculars: GcetFeeCirculars;
  cutoff: GcetEmbeddedDocument;
  admissionGuide: GcetEmbeddedDocument;
  scholarship: GcetEmbeddedDocument;
}
