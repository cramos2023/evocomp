
import React, { useState } from "react";
import { usePositionManager } from "@/modules/job-evaluation/hooks/usePositionManager";
import { useToast } from "@/modules/job-evaluation/hooks/use-toast";
import { usePositionCalculator } from "@/modules/job-evaluation/hooks/usePositionCalculator";
import EvaluationHeader from "./EvaluationHeader";
import PositionList from "./PositionList";
import ResultsDisplay from "./ResultsDisplay";
import { Position } from "@/modules/job-evaluation/types/position";

const EvaluationForm: React.FC = () => {
  const { toast } = useToast();
  const {
    positions,
    setPositions,
    addPosition,
    removePosition,
    updatePosition
  } = usePositionManager();
  
  // Add position calculator hook to get calculation functions
  const { calculatePosition, calculateAllPositions } = usePositionCalculator(positions, setPositions);
  
  // Add state to track the last calculated position index
  const [lastCalculatedIndex, setLastCalculatedIndex] = useState<number | null>(null);
  
  // Wrap calculatePosition to also update lastCalculatedIndex
  const handleCalculatePosition = (index: number) => {
    calculatePosition(index);
    setLastCalculatedIndex(index);
  };

  // Create wrapper function to adapt updatePosition to the expected format for PositionList
  const handleUpdatePosition = (index: number, updatedPosition: Position) => {
    // Update each changed field individually
    Object.keys(updatedPosition).forEach(key => {
      const fieldKey = key as keyof Position;
      updatePosition(index, fieldKey, updatedPosition[fieldKey]);
    });
  };

  const exportToPDF = () => {
    // In a real application, this would generate a PDF
    toast({
      title: "Export Initiated",
      description: "The evaluation data is being exported to PDF.",
    });
  };

  const exportToCSV = () => {
    // In a real application, this would generate a CSV
    toast({
      title: "Export Initiated",
      description: "The evaluation data is being exported to CSV.",
    });
  };

  return (
    <div className="space-y-8">
      <EvaluationHeader exportToPDF={exportToPDF} exportToCSV={exportToCSV} />

      <PositionList
        positions={positions}
        onUpdate={handleUpdatePosition}
        onRemove={removePosition}
        onCalculate={handleCalculatePosition}
        onAdd={addPosition}
      />

      {lastCalculatedIndex !== null && positions[lastCalculatedIndex]?.result && (
        <div className="pt-6">
          <ResultsDisplay 
            result={positions[lastCalculatedIndex].result} 
          />
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;
