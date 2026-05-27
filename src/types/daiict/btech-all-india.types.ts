export type DaiictBtechCategory = 'all_india' | 'nri' | 'gujarat';

export type DaiictBtechSectionKey =
  | 'important_dates'
  | 'intake'
  | 'program_structures'
  | 'placement_statistics'
  | 'eligibility_criteria'
  | 'selection_criteria'
  | 'admission_criteria'
  | 'fee_structure'
  | 'scholarships'
  | 'how_to_apply'
  | 'admission_procedures'
  | 'post_admission_procedures'
  | 'faqs'
  | 'for_inquiries'
  | 'important_notes';

/** Back-compat alias (was added in the initial DAIICT All India work). */
export type DaiictBtechAllIndiaSectionKey = DaiictBtechSectionKey;

export interface ImportantDatesEntry {
  label: string;
  date: string;
}

export interface ImportantDatesData {
  entries: ImportantDatesEntry[];
}

export interface IntakeProgrammeRow {
  programme: string;
  seats: string;
}

export interface IntakeData {
  total_seats: string;
  programmes: IntakeProgrammeRow[];
}

export interface ProgramStructureItem {
  programme: string;
  description: string;
  brochure_url: string | null;
  more_info_url: string | null;
}

export interface ProgramStructuresData {
  programmes: ProgramStructureItem[];
}

export interface PlacementStatisticsData {
  placement_image_url: string | null;
  prominent_recruiters_image_url: string | null;
}

/** Reusable rich-text block (heading / paragraph / list). */
export type DaiictContentItem =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

/** Back-compat alias. */
export type EligibilityContentItem = DaiictContentItem;

export interface EligibilityData {
  content: DaiictContentItem[];
}

export interface SelectionCriteriaData {
  paragraphs: string[];
}

export interface AdmissionCriteriaData {
  content: DaiictContentItem[];
}

export interface AdmissionProceduresData {
  content: DaiictContentItem[];
}

export interface PostAdmissionProceduresData {
  content: DaiictContentItem[];
}

export interface FeeStructureRow {
  description: string;
  amount: string;
}

export interface FeeStructureData {
  intro: string | null;
  currency: 'INR' | 'USD' | null;
  fees: FeeStructureRow[];
  notes: string[];
  value_added_courses_notes: string[];
  education_loan: string | null;
  refund_policy: string | null;
}

export interface ScholarshipLink {
  label: string;
  url: string;
}

export interface ScholarshipsData {
  introduction: string | null;
  highlights: string[];
  dau_scholarships: string | null;
  other_scholarship_links: ScholarshipLink[];
  ug_scholarship_links: ScholarshipLink[];
}

export interface HowToApplyData {
  apply_url: string | null;
  notes: string[];
}

export interface FaqsData {
  description: string;
  faqs_url: string | null;
}

export interface ForInquiriesData {
  heading: string | null;
  organization: string | null;
  address: string | null;
  voice_call: string | null;
  email: string | null;
}

export interface ImportantNotesData {
  paragraphs: string[];
}

export type DaiictBtechSectionData =
  | ImportantDatesData
  | IntakeData
  | ProgramStructuresData
  | PlacementStatisticsData
  | EligibilityData
  | SelectionCriteriaData
  | AdmissionCriteriaData
  | AdmissionProceduresData
  | PostAdmissionProceduresData
  | FeeStructureData
  | ScholarshipsData
  | HowToApplyData
  | FaqsData
  | ForInquiriesData
  | ImportantNotesData;

/** Back-compat alias. */
export type DaiictBtechAllIndiaSectionData = DaiictBtechSectionData;

export interface DaiictBtechSectionPayload {
  university: 'daiict';
  programme: 'btech';
  category: DaiictBtechCategory;
  section: DaiictBtechSectionKey;
  data: DaiictBtechSectionData;
}

/** Back-compat alias. */
export type DaiictBtechAllIndiaSectionPayload = DaiictBtechSectionPayload;

export const DAIICT_BTECH_ALL_INDIA_URL =
  'https://www.daiict.ac.in/undergraduate-admissions-all-india-category';

export const DAIICT_BTECH_NRI_URL =
  'https://www.daiict.ac.in/undergraduate-admissions-nri-and-foreign-national-category';

export const DAIICT_BTECH_GUJARAT_URL =
  'https://www.daiict.ac.in/undergraduate-admissions-gujarat-category';

export const DAIICT_BASE_URL = 'https://www.daiict.ac.in';
