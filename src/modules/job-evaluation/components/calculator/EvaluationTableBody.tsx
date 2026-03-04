
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import OrganizationRows from "./table/OrganizationRows";
import DimensionRows from "./table/DimensionRows";
import ResultRows from "./table/ResultRows";

interface EvaluationTableBodyProps {
  positions: Position[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  getCareerStreamOptions: (directReports?: string) => any[];
  getJobFamilyOptions: (careerFunction?: string) => any[];
  getCareerLevelOptions: (careerStream?: string) => any[];
  onCalculatePosition: (index: number) => void;
  visiblePositions?: number[]; // Array of position indices that should be visible
}

const EvaluationTableBody: React.FC<EvaluationTableBodyProps> = ({
  positions,
  onUpdatePosition,
  getCareerStreamOptions,
  getJobFamilyOptions,
  getCareerLevelOptions,
  onCalculatePosition,
  visiblePositions = positions.map((_, i) => i) // Default to showing all positions
}) => {
  // Filter visiblePositions to only include indices that exist in the positions array
  const validVisiblePositions = visiblePositions.filter(index => index < positions.length);
  
  return (
    <tbody>
      {/* Organization Information Rows */}
      <OrganizationRows 
        positions={positions}
        onUpdatePosition={onUpdatePosition}
        getCareerStreamOptions={getCareerStreamOptions}
        getJobFamilyOptions={getJobFamilyOptions}
        getCareerLevelOptions={getCareerLevelOptions}
        onCalculatePosition={onCalculatePosition}
        visiblePositions={validVisiblePositions}
      />
      
      {/* Dimension Evaluation Rows */}
      <DimensionRows 
        positions={positions}
        onUpdatePosition={onUpdatePosition}
        visiblePositions={validVisiblePositions}
      />
      
      {/* Results Display Rows */}
      <ResultRows 
        positions={positions}
        visiblePositions={validVisiblePositions}
      />
    </tbody>
  );
};

export default EvaluationTableBody;
