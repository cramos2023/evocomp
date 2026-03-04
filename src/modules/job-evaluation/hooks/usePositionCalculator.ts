
import { useToast } from "@/modules/job-evaluation/hooks/use-toast";
import { Position } from "@/modules/job-evaluation/types/position";
import { calculateEvaluation, EvaluationResult as CalculatorEvaluationResult } from "@/modules/job-evaluation/utils/calculatorUtils";
import { Dispatch, SetStateAction } from "react";
import { usePositionValidator } from "./calculator/usePositionValidator";
import { useEvaluationDataMapper } from "./calculator/useEvaluationDataMapper";

export const usePositionCalculator = (
  positions: Position[],
  setPositions: Dispatch<SetStateAction<Position[]>>
) => {
  const { toast } = useToast();
  const { validatePositionFields } = usePositionValidator();
  const { createEvaluationInput, mapCalculationToResult } = useEvaluationDataMapper();

  const calculatePosition = (index: number) => {
    const position = positions[index];
    
    // Validate that all required fields have values
    if (!validatePositionFields(position)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields for this position.",
        variant: "destructive",
      });
      return;
    }
    
    // Create an input object that matches EvaluationInput structure
    const evalInput = createEvaluationInput(position);
    
    // Calculate the results
    const calculationResult = calculateEvaluation(evalInput);
    
    if (calculationResult) {
      // Convert the calculationResult to match our EvaluationResult type
      const result = mapCalculationToResult(calculationResult);
      
      const updatedPositions = [...positions];
      updatedPositions[index] = {
        ...position,
        result,
      };
      
      setPositions(updatedPositions);
      
      toast({
        title: "Calculation Complete",
        description: `RCS Grade: ${result.rcsGrade} (Position Class: ${result.positionClass})`,
      });
    } else {
      toast({
        title: "Calculation Failed",
        description: "There was an error calculating the position evaluation.",
        variant: "destructive",
      });
    }
  };

  const calculateAllPositions = () => {
    let calculatedCount = 0;
    let incompleteCount = 0;
    
    const updatedPositions = positions.map(position => {
      // Check if position has all required fields
      if (!validatePositionFields(position)) {
        incompleteCount++;
        return position;
      }
      
      // Create an input object that matches EvaluationInput structure
      const evalInput = createEvaluationInput(position);
      
      // Calculate results
      const calculationResult = calculateEvaluation(evalInput);
      if (calculationResult) {
        calculatedCount++;
        // Ensure proper type conversion using mapper
        const mappedResult = mapCalculationToResult(calculationResult);
        return { 
          ...position, 
          result: mappedResult
        };
      }
      
      incompleteCount++;
      return position;
    }) as Position[]; // Add type assertion to help TypeScript understand array type
    
    if (calculatedCount === 0) {
      toast({
        title: "No Calculations Performed",
        description: "Please fill in all required information for at least one position.",
        variant: "destructive",
      });
    } else if (incompleteCount > 0) {
      toast({
        title: `${calculatedCount} Calculation${calculatedCount > 1 ? 's' : ''} Complete`,
        description: `${incompleteCount} position${incompleteCount > 1 ? 's' : ''} could not be calculated due to missing information.`,
      });
    } else {
      toast({
        title: "All Calculations Complete",
        description: "All positions have been evaluated successfully.",
      });
    }
    
    setPositions(updatedPositions);
  };

  return {
    calculatePosition,
    calculateAllPositions,
    validatePositionFields
  };
};
