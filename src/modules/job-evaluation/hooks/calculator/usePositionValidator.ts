
import { Position } from "@/modules/job-evaluation/types/position";

export const usePositionValidator = () => {
  // Helper function to check if a position has all required fields
  const validatePositionFields = (position: Position): boolean => {
    // Validate required fields
    const requiredFields = [
      "impact", "contribution", "size", "communication", "frame", 
      "innovation", "complexity", "knowledge", "teams", 
      "breadth", "risk", "environment"
    ];
    
    const missingFields = requiredFields.filter(field => 
      position[field as keyof Position] === undefined || position[field as keyof Position] === null
    );
    
    return missingFields.length === 0 && !!position.jobTitle;
  };
  
  return {
    validatePositionFields
  };
};
