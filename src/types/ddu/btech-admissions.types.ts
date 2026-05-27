export type DduBtechCategory = 'acpc' | 'management' | 'jee';

export type DduLinkKind = 'google_form' | 'pdf' | 'docx' | 'other';

export type DduAdmissionLink = {
  title: string;
  url: string;
  kind: DduLinkKind;
  /** Nearest orange section heading from the source page, if any */
  section: string | null;
};

export interface DduBtechAdmissionPayload {
  university: 'ddu';
  programme: 'btech';
  category: DduBtechCategory;
  sourceUrl: string;
  /** Short context for categories with no online application on this page */
  notes: string | null;
  links: DduAdmissionLink[];
}

export const DDU_ADMISSION_FOT_URL = 'https://www.ddu.ac.in/Admission2026-FoT.php';

export const DDU_SITE_ORIGIN = 'https://www.ddu.ac.in';
