
import { OrganizationFieldsData } from "@/modules/job-evaluation/types/organizationFields";

export interface FilterState extends OrganizationFieldsData {
  initialRows?: number;
  directReports?: string;
}

export interface SidebarFilterProps {
  onFilterChange: (filters: FilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
  positions?: import("@/modules/job-evaluation/types/position").Position[]; 
}
