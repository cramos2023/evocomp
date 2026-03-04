
import React from "react";
import TableHeader from "./TableHeader";
import TableContainer from "./TableContainer";
import { FilterState } from "@/modules/job-evaluation/components/filters/types";
import { Position } from "@/modules/job-evaluation/types/position";

import { useEvaluationTableState } from "./evaluationTable/useEvaluationTableState";
import MatrixTogglesSection from "./evaluationTable/MatrixTogglesSection";
import MatricesSection from "./evaluationTable/MatricesSection";

interface EvaluationTableProps {
  initialRows?: number;
  filters?: FilterState;
  onPositionsChange?: (positions: Position[]) => void;
}

import { useTranslation } from "react-i18next";

const EvaluationTable: React.FC<EvaluationTableProps> = ({ 
  initialRows = 2,
  filters = {},
  onPositionsChange
}) => {
  const { t } = useTranslation("jobEvaluation");
  const {
    positions,
    visiblePositions,
    positionCount,
    handlePositionCountChange,
    handlePositionFieldUpdate,
    addPosition,
    removePosition,
    updatePosition,
    calculatePosition,
    calculateAllPositions,
    getCareerStreamOptions,
    getJobFamilyOptions,
    getCareerLevelOptions,
    showImpactMatrix,
    setShowImpactMatrix,
    showCommunicationMatrix,
    setShowCommunicationMatrix,
    showInnovationMatrix,
    setShowInnovationMatrix,
    showKnowledgeMatrix,
    setShowKnowledgeMatrix
  } = useEvaluationTableState(initialRows, filters, onPositionsChange);

  return (
    <div className="space-y-6 w-full">
      {/* Table header with title and export buttons */}
      <TableHeader 
        positions={positions}
        positionCount={positionCount}
        onPositionCountChange={handlePositionCountChange}
      />

      {/* Matrix Toggle Buttons - displayed side by side */}
      <MatrixTogglesSection 
        showImpactMatrix={showImpactMatrix}
        showCommunicationMatrix={showCommunicationMatrix}
        showInnovationMatrix={showInnovationMatrix}
        showKnowledgeMatrix={showKnowledgeMatrix}
        setShowImpactMatrix={setShowImpactMatrix}
        setShowCommunicationMatrix={setShowCommunicationMatrix}
        setShowInnovationMatrix={setShowInnovationMatrix}
        setShowKnowledgeMatrix={setShowKnowledgeMatrix}
      />

      {/* Reference Matrices - Conditionally rendered */}
      <MatricesSection 
        showImpactMatrix={showImpactMatrix}
        showCommunicationMatrix={showCommunicationMatrix}
        showInnovationMatrix={showInnovationMatrix}
        showKnowledgeMatrix={showKnowledgeMatrix}
      />

      {/* Main table container */}
      <TableContainer 
        positions={positions}
        visiblePositions={visiblePositions}
        onUpdatePosition={handlePositionFieldUpdate}
        onCalculatePosition={calculatePosition}
        onRemovePosition={removePosition}
        onUpdateTitle={updatePosition}
        onCalculateAll={calculateAllPositions}
        onAddPosition={addPosition}
        getCareerStreamOptions={getCareerStreamOptions}
        getJobFamilyOptions={getJobFamilyOptions}
        getCareerLevelOptions={getCareerLevelOptions}
      />
    </div>
  );
};

export default EvaluationTable;
