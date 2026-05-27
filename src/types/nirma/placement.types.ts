export interface NirmaPlacementReportRow {
  title: string;
  pdf_url: string;
}

export interface NirmaPlacementReportsPayload {
  college: 'nirma';
  institute: 'management';
  page: 'placement_reports';
  data: NirmaPlacementReportRow[];
}

export interface NirmaBtechPlacementBranchRow {
  branch: string;
  placement_percent: string;
  highest_salary_lpa: string;
}

export interface NirmaBtechHigherStudiesRow {
  branch: string;
  number_of_students: string;
}

export interface NirmaBtechCurrentYearStats {
  title: string;
  placement_by_branch: NirmaBtechPlacementBranchRow[];
  higher_studies: NirmaBtechHigherStudiesRow[];
  higher_studies_total: string | null;
  note: string | null;
}

export interface NirmaBtechYearWiseSalaryRow {
  year: string;
  highest_salary_lpa: string;
}

export interface NirmaBtechYearWisePlacement {
  title: string;
  highest_salary_by_year: NirmaBtechYearWiseSalaryRow[];
  chart_image_urls: string[];
}

export interface NirmaBtechPlacementStatsPayload {
  college: 'nirma';
  institute: 'technology';
  page: 'btech_placement_statistics';
  marquee_text: string | null;
  sections: {
    current_year: NirmaBtechCurrentYearStats | null;
    year_wise: NirmaBtechYearWisePlacement | null;
  };
}
