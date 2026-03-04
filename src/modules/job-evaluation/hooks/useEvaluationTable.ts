
import { usePositionManager } from "./usePositionManager";
import { usePositionCalculator } from "./usePositionCalculator";
import { useOrganizationOptions } from "./useOrganizationOptions";
import { Position } from "@/modules/job-evaluation/types/position";

export const useEvaluationTable = () => {
  // Use specialized hooks for different functionalities
  const {
    positions,
    setPositions,
    addPosition,
    removePosition,
    updatePosition
  } = usePositionManager();

  const {
    calculatePosition,
    calculateAllPositions,
    validatePositionFields
  } = usePositionCalculator(positions, setPositions);
  
  const {
    getCareerStreamOptions,
    getJobFamilyOptions,
    getCareerLevelOptions
  } = useOrganizationOptions();

  return {
    // Position state management
    positions,
    setPositions,
    addPosition,
    removePosition,
    updatePosition,
    
    // Calculation functions
    calculatePosition,
    calculateAllPositions,
    validatePositionFields,
    
    // Organization data helpers
    getCareerStreamOptions,
    getJobFamilyOptions,
    getCareerLevelOptions
  };
};
