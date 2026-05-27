export interface BvmPlacementDetailRow {
  academic_year: string;
  pdf_url: string;
}

export interface BvmPlacementDetailsPayload {
  college: 'bvm';
  page: 'placement_details';
  data: BvmPlacementDetailRow[];
}
