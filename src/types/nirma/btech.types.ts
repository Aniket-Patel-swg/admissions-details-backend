export type NirmaBtechSectionKey =
  | 'important_information'
  | 'intake'
  | 'eligibility_criteria'
  | 'selection_criteria'
  | 'placement_statistics'
  | 'fee_structure'
  | 'scholarships'
  | 'how_to_apply'
  | 'for_inquiries';

/** When both All India and NRI columns apply. */
export interface NirmaCategoryPair {
  all_india_category: string;
  nri_nri_sponsored_category: string;
}

export interface ImportantInformationData {
  online_application_start_date: string;
  last_date_for_online_application: string;
  last_date_to_upload_pending_documents_modify_branch_preferences: string;
  declaration_of_provisional_merit_list: string;
  date_of_online_allotment_round_1: NirmaCategoryPair;
  last_date_of_payment_online_round_1: NirmaCategoryPair;
  date_of_online_allotment_round_2: NirmaCategoryPair;
  last_date_of_payment_online_round_2: NirmaCategoryPair;
  date_of_online_allotment_round_3: NirmaCategoryPair;
  last_date_of_payment_online_round_3: NirmaCategoryPair;
  date_of_online_allotment_round_4: NirmaCategoryPair;
  last_date_of_payment_online_round_4: NirmaCategoryPair;
  last_date_for_cancellation_through_online_module: string;
  commencement_of_academic_term: string;
  in_person_document_verification: string;
  schedule_note: string | null;
}

export interface IntakeProgrammeRow {
  programme_name: string;
  state_quota_seats_acpc: string;
  all_india_seats: string;
  nri_nri_sponsored_seats: string;
  total_seats: string;
}

export interface IntakeData {
  programmes: IntakeProgrammeRow[];
  totals: IntakeProgrammeRow | null;
  seats_may_vary_note: string | null;
}

export type EligibilityContentItem =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

export interface EligibilityData {
  content: EligibilityContentItem[];
}

export interface SelectionCategoryData {
  title: string;
  points: string[];
}

export interface SelectionCriteriaData {
  categories: SelectionCategoryData[];
}

export interface PlacementByBranchRow {
  branch: string;
  placement_percent: string;
  highest_salary_lpa: string;
}

export interface HigherStudiesByBranchRow {
  branch: string;
  number_of_students: string;
}

export interface PlacementStatisticsData {
  placement_heading: string | null;
  placement_by_branch: PlacementByBranchRow[];
  higher_studies_heading: string | null;
  higher_studies_by_branch: HigherStudiesByBranchRow[];
}

export interface FeeLineItem {
  serial_number: string | null;
  description: string;
  amount: string;
}

export interface FeeCategoryBlock {
  category_caption: string | null;
  rows: FeeLineItem[];
}

export interface FeeStructureData {
  categories: FeeCategoryBlock[];
}

export interface ScholarshipTableData {
  caption: string | null;
  column_keys: string[];
  rows: Record<string, string>[];
}

export interface ScholarshipBlockData {
  section_title: string | null;
  tables: ScholarshipTableData[];
}

export interface ScholarshipsData {
  introduction: string | null;
  blocks: ScholarshipBlockData[];
  notes_and_policy: string[];
}

export interface HowToApplyData {
  instruction_for_online_application_pdf_url: string | null;
  guideline_online_allotment_pdf_url: string | null;
  application_fee_within_gujarat_in_inr: number | null;
  application_fee_outside_gujarat_in_inr: number | null;
  additional_notes: string[];
}

export interface ForInquiriesData {
  admission_office_address: string;
  phone_numbers: string;
  email: string | null;
  office_timings: string;
  more_information_url: string | null;
}

export type NirmaBtechSectionData =
  | ImportantInformationData
  | IntakeData
  | EligibilityData
  | SelectionCriteriaData
  | PlacementStatisticsData
  | FeeStructureData
  | ScholarshipsData
  | HowToApplyData
  | ForInquiriesData;

export interface NirmaBtechSectionPayload {
  university: 'nirma';
  programme: 'btech';
  section: NirmaBtechSectionKey;
  data: NirmaBtechSectionData;
}
