
import React from "react";
import OrgSelectField from "./OrgSelectField";
import { COUNTRIES, ORG_SIZES } from "@/modules/job-evaluation/utils/organizationData";
import { OrganizationFieldsData } from "@/modules/job-evaluation/types/organizationFields";

interface OrgFieldsFirstRowProps {
  data: OrganizationFieldsData;
  onFieldChange: (field: keyof OrganizationFieldsData, value: string | number) => void;
}

const OrgFieldsFirstRow: React.FC<OrgFieldsFirstRowProps> = ({ data, onFieldChange }) => {
  return (
    <>
      <div className="col-span-6">
        <OrgSelectField
          field="country"
          label="Country"
          options={COUNTRIES}
          value={data.country}
          onChange={(value) => onFieldChange("country", value)}
        />
      </div>
      <div className="col-span-6">
        <OrgSelectField
          field="orgSize"
          label="Org. Size"
          options={ORG_SIZES}
          value={data.orgSize}
          onChange={(value) => onFieldChange("orgSize", Number(value))}
        />
      </div>
    </>
  );
};

export default OrgFieldsFirstRow;
