
import { Position } from "@/modules/job-evaluation/types/position";
import { EvaluationInput, EvaluationResult as CalculatorEvaluationResult } from "@/modules/job-evaluation/utils/calculatorUtils";
import { EvaluationResult as PositionEvaluationResult } from "@/modules/job-evaluation/types/position";

export const useEvaluationDataMapper = () => {
  // Create an evaluation input object from position data
  const createEvaluationInput = (position: Position): EvaluationInput => {
    return {
      impact: position.impact ?? 0,
      contribution: position.contribution ?? 0,
      size: position.size ?? 0,
      communication: position.communication ?? 0,
      frame: position.frame ?? 0,
      innovation: position.innovation ?? 0,
      complexity: position.complexity ?? 0,
      knowledge: position.knowledge ?? 0,
      teams: position.teams ?? 0,
      breadth: position.breadth ?? 0,
      risk: position.risk ?? 0,
      environment: position.environment ?? 0
    };
  };

  // Map calculation result to position result format
  const mapCalculationToResult = (calculationResult: CalculatorEvaluationResult): PositionEvaluationResult => {
    return {
      totalPoints: calculationResult.totalPoints,
      positionClass: calculationResult.positionClass,
      rcsGrade: calculationResult.rcsGrade,
      pointsImpactContribution: calculationResult.pointsImpactContribution,
      pointsSize: calculationResult.pointsSize,
      pointsCommunicationFrame: calculationResult.pointsCommunicationFrame,
      pointsInnovationComplexity: calculationResult.pointsInnovationComplexity,
      pointsKnowledgeTeams: calculationResult.pointsKnowledgeTeams,
      pointsBreadth: calculationResult.pointsBreadth,
      pointsRiskEnvironment: calculationResult.pointsRiskEnvironment,
      // Add required grade and level properties from Position.ts EvaluationResult interface
      grade: calculationResult.rcsGrade,
      level: calculationResult.positionClass.toString()
    };
  };

  return {
    createEvaluationInput,
    mapCalculationToResult
  };
};
