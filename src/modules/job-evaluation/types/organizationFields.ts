
// Define organization field types
export interface OrganizationFieldsData {
  country?: string;
  orgSize?: number;
  directReports?: string;
  careerStream?: string;
  careerFunction?: string;
  jobFamily?: string;
  careerLevel?: string;
}

export interface OrganizationFieldsProps {
  data: OrganizationFieldsData;
  onChange: (updatedData: OrganizationFieldsData) => void;
}
