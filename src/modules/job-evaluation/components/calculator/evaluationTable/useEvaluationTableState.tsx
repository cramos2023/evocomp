
import { useState, useEffect } from "react";
import { Position } from "@/modules/job-evaluation/types/position";
import { FilterState } from "@/modules/job-evaluation/components/filters/types";
import { useEvaluationTable } from "@/modules/job-evaluation/hooks/useEvaluationTable";

export const useEvaluationTableState = (
  initialRows: number = 2,
  filters: FilterState = {},
  onPositionsChange?: (positions: Position[]) => void
) => {
  const { 
    positions, 
    setPositions,
    addPosition, 
    removePosition, 
    updatePosition,
    calculatePosition,
    calculateAllPositions,
    getCareerStreamOptions,
    getJobFamilyOptions,
    getCareerLevelOptions
  } = useEvaluationTable();

  // State for showing/hiding the reference matrices
  const [showImpactMatrix, setShowImpactMatrix] = useState(false);
  const [showCommunicationMatrix, setShowCommunicationMatrix] = useState(false);
  const [showInnovationMatrix, setShowInnovationMatrix] = useState(false);
  const [showKnowledgeMatrix, setShowKnowledgeMatrix] = useState(false);
  
  // Track current position count for the dropdown
  const [positionCount, setPositionCount] = useState(initialRows || 2);
  // Track which positions are visible based on filters
  const [visiblePositions, setVisiblePositions] = useState<number[]>([]);

  // Initialize with the specified number of positions
  useEffect(() => {
    // Use initialRows directly without limiting to 2
    const targetCount = Math.max(1, initialRows || 2);
    setPositionCount(targetCount);
    
    // Adjust positions array length if needed (only on initialization)
    if (positions.length !== targetCount) {
      if (positions.length < targetCount) {
        // Add more positions if needed
        const newPositions = [...positions];
        for (let i = positions.length; i < targetCount; i++) {
          newPositions.push({
            jobTitle: "",
            dimensions: {
              impact: { value: 3, points: 0 },
              communication: { value: 3, points: 0 },
              innovation: { value: 2, points: 0 },
              knowledge: { value: 3, points: 0 },
              risk: { value: 1.5, points: 0 },
              operational: { value: 2, points: 0 }
            },
            impact: 3,
            contribution: 3,
            size: 5,
            communication: 3,
            frame: 2,
            innovation: 2,
            complexity: 2,
            knowledge: 3,
            teams: 2,
            breadth: 2,
            risk: 1.5,
            environment: 2,
            result: undefined
          });
        }
        setPositions(newPositions);
      } else if (positions.length > targetCount) {
        // Remove excess positions
        const updatedPositions = [...positions].slice(0, targetCount);
        setPositions(updatedPositions);
      }
    }
  }, [initialRows]);

  // Apply filters to determine which positions should be visible
  useEffect(() => {
    if (!positions.length) {
      setVisiblePositions([]);
      return;
    }

    // Start with all positions visible
    let visible = positions.map((_, index) => index);

    // Apply filters to hide positions that don't match criteria
    if (filters && Object.keys(filters).length > 0) {
      visible = visible.filter(index => {
        const position = positions[index];
        
        // Check each filter criterion
        if (filters.country && position.country !== filters.country) return false;
        // Convert orgSize to number for comparison
        if (filters.orgSize && position.orgSize !== Number(filters.orgSize)) return false;
        if (filters.directReports && position.directReports !== filters.directReports) return false;
        if (filters.careerStream && position.careerStream !== filters.careerStream) return false;
        if (filters.careerFunction && position.careerFunction !== filters.careerFunction) return false;
        if (filters.jobFamily && position.jobFamily !== filters.jobFamily) return false;
        if (filters.careerLevel && position.careerLevel !== filters.careerLevel) return false;
        
        return true;
      });
    }
    
    setVisiblePositions(visible);
  }, [filters, positions]);

  // Inform parent component about position changes
  useEffect(() => {
    if (onPositionsChange) {
      onPositionsChange(positions);
    }
  }, [positions, onPositionsChange]);

  const handlePositionFieldUpdate = (index: number, field: keyof Position, value: any) => {
    updatePosition(index, field, value);
  };

  // Handler for changing position count
  const handlePositionCountChange = (count: number) => {
    // Ensure count is at least 1
    const newCount = Math.max(1, count);
    const currentCount = positions.length;
    
    if (newCount === currentCount) return;
    
    if (newCount < currentCount) {
      // Remove positions from the end
      for (let i = currentCount - 1; i >= newCount; i--) {
        removePosition(i);
      }
    } else {
      // Add positions
      for (let i = currentCount; i < newCount; i++) {
        addPosition();
      }
    }
    
    setPositionCount(newCount);
  };

  return {
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
  };
};
