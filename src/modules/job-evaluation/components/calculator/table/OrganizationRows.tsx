
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import OrgSectionHeader from "./OrgSectionHeader";
import OrgFieldRowComponent from "./OrgFieldRowComponent";
import CareerStreamRow from "./CareerStreamRow";
import JobFamilyRow from "./JobFamilyRow";
import CareerLevelRow from "./CareerLevelRow";
import CalculateButtons from "./CalculateButtons";

interface OrganizationRowsProps {
  positions: Position[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  getCareerStreamOptions: (directReports?: string) => any[];
  getJobFamilyOptions: (careerFunction?: string) => any[];
  getCareerLevelOptions: (careerStream?: string) => any[];
  onCalculatePosition: (index: number) => void;
  visiblePositions: number[];
}

const OrganizationRows: React.FC<OrganizationRowsProps> = ({
  positions,
  onUpdatePosition,
  getCareerStreamOptions,
  getJobFamilyOptions,
  getCareerLevelOptions,
  onCalculatePosition,
  visiblePositions
}) => {
  return (
    <>
      {/* Header for organizational information */}
      <OrgSectionHeader visiblePositions={visiblePositions} />
      
      {/* Country Row */}
      <OrgFieldRowComponent
        fieldName="country"
        labelText="Country"
        positions={positions}
        visiblePositions={visiblePositions}
        fieldKey="country"
        options={["USA", "Argentina", "Brazil", "Chile", "Colombia", "Mexico", "Peru"]}
        onUpdatePosition={onUpdatePosition}
      />
      
      {/* Org Size Row */}
      <OrgFieldRowComponent
        fieldName="orgSize"
        labelText="Org Size"
        positions={positions}
        visiblePositions={visiblePositions}
        fieldKey="orgSize"
        options={Array.from({ length: 20 }, (_, i) => i + 1)}
        onUpdatePosition={onUpdatePosition}
      />
      
      {/* Direct Reports Row */}
      <OrgFieldRowComponent
        fieldName="directReports"
        labelText="Direct Reports"
        positions={positions}
        visiblePositions={visiblePositions}
        fieldKey="directReports"
        options={["Yes", "No"]}
        onUpdatePosition={onUpdatePosition}
      />
      
      {/* Career Stream Row */}
      <CareerStreamRow
        positions={positions}
        visiblePositions={visiblePositions}
        onUpdatePosition={onUpdatePosition}
        getCareerStreamOptions={getCareerStreamOptions}
      />
      
      {/* Career Function Row */}
      <OrgFieldRowComponent
        fieldName="careerFunction"
        labelText="Career Function"
        positions={positions}
        visiblePositions={visiblePositions}
        fieldKey="careerFunction"
        options={[
          "Customer Services", 
          "Finance", 
          "General Management", 
          "Human Resources", 
          "Information Technology", 
          "Marketing", 
          "Operations", 
          "Sales"
        ]}
        onUpdatePosition={onUpdatePosition}
      />
      
      {/* Job Family Row */}
      <JobFamilyRow
        positions={positions}
        visiblePositions={visiblePositions}
        onUpdatePosition={onUpdatePosition}
        getJobFamilyOptions={getJobFamilyOptions}
      />
      
      {/* Career Level Row */}
      <CareerLevelRow
        positions={positions}
        visiblePositions={visiblePositions}
        onUpdatePosition={onUpdatePosition}
        getCareerLevelOptions={getCareerLevelOptions}
      />
      
      {/* Individual calculate buttons */}
      <CalculateButtons 
        visiblePositions={visiblePositions}
        onCalculatePosition={onCalculatePosition}
      />
    </>
  );
};

export default OrganizationRows;
