
import React from "react";
import OrgSelectField from "./OrgSelectField";
import { DIRECT_REPORTS_OPTIONS, CAREER_STREAMS, CAREER_FUNCTIONS } from "@/modules/job-evaluation/utils/organizationData";
import { OrganizationFieldsData } from "@/modules/job-evaluation/types/organizationFields";

interface OrgFieldsSecondRowProps {
  data: OrganizationFieldsData;
  onFieldChange: (field: keyof OrganizationFieldsData, value: string | number) => void;
  getCareerStreamOptions: () => string[];
}

const OrgFieldsSecondRow: React.FC<OrgFieldsSecondRowProps> = ({ 
  data, 
  onFieldChange,
  getCareerStreamOptions
}) => {
  return (
    <>
      <div className="col-span-4">
        <OrgSelectField
          field="directReports"
          label="Direct Reports"
          options={DIRECT_REPORTS_OPTIONS}
          value={data.directReports}
          onChange={(value) => onFieldChange("directReports", value)}
        />
      </div>
      <div className="col-span-4">
        <OrgSelectField
          field="careerStream"
          label="Career Stream"
          options={getCareerStreamOptions()}
          value={data.careerStream}
          onChange={(value) => onFieldChange("careerStream", value)}
          placeholder={data.directReports ? `Select Career Stream` : "Select Direct Reports first"}
          disabled={!data.directReports}
        />
      </div>
      <div className="col-span-4">
        <OrgSelectField
          field="careerFunction"
          label="Career Function"
          options={CAREER_FUNCTIONS}
          value={data.careerFunction}
          onChange={(value) => onFieldChange("careerFunction", value)}
        />
      </div>
    </>
  );
};

export default OrgFieldsSecondRow;
