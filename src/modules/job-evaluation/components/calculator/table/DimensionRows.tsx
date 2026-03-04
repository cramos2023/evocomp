
import React from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import DimensionRow from "./DimensionRow";
import DimensionSectionHeader from "./DimensionSectionHeader";

interface DimensionRowsProps {
  positions: Position[];
  onUpdatePosition: (index: number, field: keyof Position, value: any) => void;
  visiblePositions: number[];
}

const DimensionRows: React.FC<DimensionRowsProps> = ({
  positions,
  onUpdatePosition,
  visiblePositions
}) => {
  // Define all dimensions to be displayed
  const dimensions = [
    { key: "impact", name: "Impact" },
    { key: "contribution", name: "Contribution" },
    { key: "size", name: "Size" },
    { key: "communication", name: "Communication" },
    { key: "frame", name: "Frame" },
    { key: "innovation", name: "Innovation" },
    { key: "complexity", name: "Complexity" },
    { key: "knowledge", name: "Knowledge" },
    { key: "teams", name: "Teams" },
    { key: "breadth", name: "Breadth" },
    { key: "risk", name: "Risk" },
    { key: "environment", name: "Environment" },
  ];

  return (
    <>
      {/* Header for dimensions section */}
      <DimensionSectionHeader visiblePositions={visiblePositions} />
      
      {/* Render all dimension rows */}
      {dimensions.map(dimension => (
        <DimensionRow
          key={dimension.key}
          dimensionKey={dimension.key}
          displayName={dimension.name}
          positions={positions}
          onUpdatePosition={onUpdatePosition}
          visiblePositions={visiblePositions}
        />
      ))}
    </>
  );
};

export default DimensionRows;
