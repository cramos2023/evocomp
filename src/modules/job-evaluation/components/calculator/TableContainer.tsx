
import React from "react";
import PositionControls from "./PositionControls";
import EvaluationTableHeader from "./EvaluationTableHeader";
import EvaluationTableBody from "./EvaluationTableBody";
import { Position } from "@/modules/job-evaluation/types/position";
import TableWrapper from "./table/TableWrapper";
import TableScrollContainer from "./table/TableScrollContainer";

interface TableContainerProps {
  positions: Position[];
  visiblePositions: number[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  onCalculatePosition: (index: number) => void;
  onRemovePosition: (index: number) => void;
  onUpdateTitle: (index: number, field: keyof Position, value: string) => void;
  onCalculateAll: () => void;
  onAddPosition: () => void;
  getCareerStreamOptions: (directReports?: string) => any[];
  getJobFamilyOptions: (careerFunction?: string) => any[];
  getCareerLevelOptions: (careerStream?: string) => any[];
}

const TableContainer: React.FC<TableContainerProps> = ({
  positions,
  visiblePositions,
  onUpdatePosition,
  onCalculatePosition,
  onRemovePosition,
  onUpdateTitle,
  onCalculateAll,
  onAddPosition,
  getCareerStreamOptions,
  getJobFamilyOptions,
  getCareerLevelOptions
}) => {
  return (
    <TableWrapper>
      {/* Header actions */}
      <PositionControls 
        onCalculateAll={onCalculateAll} 
        onAddPosition={onAddPosition} 
      />

      {/* Table with fixed header and scrollable body */}
      <TableScrollContainer>
        <table className="w-full border-collapse table-fixed">
          {/* Sticky Header - Always visible */}
          <EvaluationTableHeader 
            positions={positions}
            onUpdateTitle={onUpdateTitle}
            onCalculatePosition={onCalculatePosition}
            onRemovePosition={onRemovePosition}
            visiblePositions={visiblePositions}
          />
          
          {/* Scrollable Table Body */}
          <EvaluationTableBody 
            positions={positions}
            onUpdatePosition={onUpdatePosition}
            getCareerStreamOptions={getCareerStreamOptions}
            getJobFamilyOptions={getJobFamilyOptions}
            getCareerLevelOptions={getCareerLevelOptions}
            onCalculatePosition={onCalculatePosition}
            visiblePositions={visiblePositions}
          />
        </table>
      </TableScrollContainer>
    </TableWrapper>
  );
};

export default TableContainer;
