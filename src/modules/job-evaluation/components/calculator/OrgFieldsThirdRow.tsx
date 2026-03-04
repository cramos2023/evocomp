
import React from "react";
import OrgSelectField from "./OrgSelectField";
import { OrganizationFieldsData } from "@/modules/job-evaluation/types/organizationFields";

interface OrgFieldsThirdRowProps {
  data: OrganizationFieldsData;
  onFieldChange: (field: keyof OrganizationFieldsData, value: string | number) => void;
  getJobFamilyOptions: () => string[];
  getCareerLevelOptions: () => string[];
}

const OrgFieldsThirdRow: React.FC<OrgFieldsThirdRowProps> = ({ 
  data, 
  onFieldChange,
  getJobFamilyOptions,
  getCareerLevelOptions
}) => {
  return (
    <>
      <div className="col-span-6">
        <OrgSelectField
          field="jobFamily"
          label="Job Family"
          options={getJobFamilyOptions()}
          value={data.jobFamily}
          onChange={(value) => onFieldChange("jobFamily", value)}
          placeholder={data.careerFunction ? `Select Job Family` : "Select Career Function first"}
          disabled={!data.careerFunction}
        />
      </div>
      <div className="col-span-6">
        <OrgSelectField
          field="careerLevel"
          label="Career Level"
          options={getCareerLevelOptions()}
          value={data.careerLevel}
          onChange={(value) => onFieldChange("careerLevel", value)}
          placeholder={data.careerStream ? `Select Career Level` : "Select Career Stream first"}
          disabled={!data.careerStream}
        />
      </div>
    </>
  );
};

export default OrgFieldsThirdRow;
