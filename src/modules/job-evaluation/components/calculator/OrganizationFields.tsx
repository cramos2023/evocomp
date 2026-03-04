
import React, { useState, useEffect } from "react";
import { 
  CAREER_STREAMS, 
  JOB_FAMILIES, 
  CAREER_LEVELS
} from "@/modules/job-evaluation/utils/organizationData";
import OrgFieldsFirstRow from "./OrgFieldsFirstRow";
import OrgFieldsSecondRow from "./OrgFieldsSecondRow";
import OrgFieldsThirdRow from "./OrgFieldsThirdRow";
import { OrganizationFieldsData, OrganizationFieldsProps } from "@/modules/job-evaluation/types/organizationFields";

const OrganizationFields: React.FC<OrganizationFieldsProps> = ({ data, onChange }) => {
  // Local state to track UI interactions
  const [localData, setLocalData] = useState<OrganizationFieldsData>(data || {});

  // Update local state when parent data changes
  useEffect(() => {
    setLocalData(data || {});
  }, [data]);

  // Update parent when local data changes
  useEffect(() => {
    onChange(localData);
  }, [localData, onChange]);

  // Handle field changes with conditional logic
  const handleFieldChange = (field: keyof OrganizationFieldsData, value: string | number) => {
    const updatedData = { ...localData, [field]: value };
    
    // Apply conditional logic
    if (field === 'directReports') {
      // Reset career stream when direct reports changes
      updatedData.careerStream = undefined;
      updatedData.careerLevel = undefined;
    } 
    else if (field === 'careerStream') {
      // Reset career level when career stream changes
      updatedData.careerLevel = undefined;
    }
    else if (field === 'careerFunction') {
      // Reset job family when career function changes
      updatedData.jobFamily = undefined;
    }
    
    setLocalData(updatedData);
  };

  // Helper to get available career stream options based on direct reports
  const getCareerStreamOptions = () => {
    if (!localData.directReports) return [];
    return CAREER_STREAMS[localData.directReports as "Yes" | "No"] || [];
  };

  // Helper to get available job family options based on career function
  const getJobFamilyOptions = () => {
    if (!localData.careerFunction) return [];
    return JOB_FAMILIES[localData.careerFunction as keyof typeof JOB_FAMILIES] || [];
  };

  // Helper to get available career level options based on career stream
  const getCareerLevelOptions = () => {
    if (!localData.careerStream) return [];
    return CAREER_LEVELS[localData.careerStream as keyof typeof CAREER_LEVELS] || [];
  };

  return (
    <div className="grid grid-cols-12 gap-4 mb-6 p-4 border border-border/50 rounded-lg bg-muted/20">
      <h3 className="col-span-12 text-sm font-medium mb-2">Organization Information</h3>
      
      {/* First row */}
      <OrgFieldsFirstRow 
        data={localData} 
        onFieldChange={handleFieldChange} 
      />
      
      {/* Second row */}
      <OrgFieldsSecondRow 
        data={localData} 
        onFieldChange={handleFieldChange}
        getCareerStreamOptions={getCareerStreamOptions}
      />
      
      {/* Third row */}
      <OrgFieldsThirdRow 
        data={localData} 
        onFieldChange={handleFieldChange}
        getJobFamilyOptions={getJobFamilyOptions}
        getCareerLevelOptions={getCareerLevelOptions}
      />
    </div>
  );
};

export default OrganizationFields;
