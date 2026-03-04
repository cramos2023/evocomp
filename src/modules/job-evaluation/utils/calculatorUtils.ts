
import { lookupTables } from "./dimensionData";

export interface EvaluationInput {
  impact: number;
  contribution: number;
  size: number;
  communication: number;
  frame: number;
  innovation: number;
  complexity: number;
  knowledge: number;
  teams: number;
  breadth: number;
  risk: number;
  environment: number;
}

export interface EvaluationResult {
  pointsImpactContribution: number;
  pointsSize: number;
  pointsCommunicationFrame: number;
  pointsInnovationComplexity: number;
  pointsKnowledgeTeams: number;
  pointsBreadth: number;
  pointsRiskEnvironment: number;
  totalPoints: number;
  positionClass: number;
  rcsGrade: string;
}

// Validates that all required fields are present and non-null
const validateInputs = (data: Partial<EvaluationInput>): boolean => {
  const requiredFields: (keyof EvaluationInput)[] = [
    "impact", "contribution", "size", "communication", "frame", 
    "innovation", "complexity", "knowledge", "teams", 
    "breadth", "risk", "environment"
  ];
  
  return requiredFields.every(field => 
    data[field] !== undefined && 
    data[field] !== null &&
    !isNaN(Number(data[field]))
  );
};

// Generic lookup function to find values in 2D tables
const lookupValueIn2DTable = (
  table: { rows: number[]; cols: number[]; values: number[][] },
  rowValue: number,
  colValue: number
): number | null => {
  // Find indices in the table
  const rowIndex = table.rows.findIndex(r => r === rowValue);
  const colIndex = table.cols.findIndex(c => c === colValue);

  // If values are not found exactly in the table, return null
  if (rowIndex === -1 || colIndex === -1) {
    console.warn(`Value not found in lookup table: row=${rowValue}, col=${colValue}`);
    return null;
  }

  return table.values[rowIndex][colIndex];
};

// Calculate breadth points based on level
const calculateBreadthPoints = (breadthLevel: number): number => {
  const entry = lookupTables.breadth.values.find(item => item.level === breadthLevel);
  return entry ? entry.points : 0;
};

// Calculate RCS Grade from Position Class
const calculateRCSGrade = (positionClass: number): string => {
  if (positionClass <= 0) return "Unknown";
  
  for (const [range, grade] of Object.entries(lookupTables.rcsGrade.positionClasses)) {
    const [high, low] = range.split("-").map(Number);
    if (positionClass <= high && positionClass >= low) {
      return grade;
    }
  }
  
  return "Unknown";
};

// Main calculation function
export const calculateEvaluation = (data: Partial<EvaluationInput>): EvaluationResult | null => {
  // Validate inputs
  if (!validateInputs(data)) {
    console.error("Invalid input data for evaluation");
    return null;
  }

  // Extract inputs (we've validated they exist)
  const {
    impact, contribution, size, communication, frame,
    innovation, complexity, knowledge, teams,
    breadth, risk, environment
  } = data as EvaluationInput;

  // 1. Calculate Impact-Contribution
  const pointsImpactContribution = lookupValueIn2DTable(
    lookupTables.impactContribution,
    impact,
    contribution
  );

  if (pointsImpactContribution === null) {
    console.error("Failed to calculate Impact-Contribution points");
    return null;
  }

  // 2. Calculate Size points - simplified, using directly the input size value, adjusts as needed
  const pointsSize = Number(size) * 2; // Simple multiplier

  // 3. Calculate Communication-Frame
  const pointsCommunicationFrame = lookupValueIn2DTable(
    lookupTables.communicationFrame,
    communication,
    frame
  );

  if (pointsCommunicationFrame === null) {
    console.error("Failed to calculate Communication-Frame points");
    return null;
  }

  // 4. Calculate Innovation-Complexity
  const pointsInnovationComplexity = lookupValueIn2DTable(
    lookupTables.innovationComplexity,
    innovation,
    complexity
  );

  if (pointsInnovationComplexity === null) {
    console.error("Failed to calculate Innovation-Complexity points");
    return null;
  }

  // 5. Calculate Knowledge-Teams
  const knowledgeTeamsPoints = lookupValueIn2DTable(
    lookupTables.knowledgeTeams,
    knowledge,
    teams
  );

  if (knowledgeTeamsPoints === null) {
    console.error("Failed to calculate Knowledge-Teams points");
    return null;
  }

  // 6. Calculate Breadth points
  const pointsBreadth = calculateBreadthPoints(breadth);

  // 7. Calculate Knowledge-Teams + Breadth
  const pointsKnowledgeTeams = knowledgeTeamsPoints + pointsBreadth;

  // 8. Calculate Risk-Environment
  const pointsRiskEnvironment = lookupValueIn2DTable(
    lookupTables.riskEnvironment,
    risk,
    environment
  );

  if (pointsRiskEnvironment === null) {
    console.error("Failed to calculate Risk-Environment points");
    return null;
  }

  // Calculate total points
  const totalPoints = (
    pointsImpactContribution +
    pointsSize +
    pointsCommunicationFrame +
    pointsInnovationComplexity +
    pointsKnowledgeTeams +
    pointsRiskEnvironment
  );

  // Calculate Position Class
  // Using the formula: Position Class = (Total Points - 26) / 25 + 40
  let positionClass = 0;
  if (totalPoints > 26) {
    positionClass = Math.round((totalPoints - 26) / 25 + 40);
  }

  // Determine RCS Grade
  const rcsGrade = calculateRCSGrade(positionClass);

  return {
    pointsImpactContribution,
    pointsSize,
    pointsCommunicationFrame,
    pointsInnovationComplexity,
    pointsKnowledgeTeams,
    pointsBreadth,
    pointsRiskEnvironment,
    totalPoints,
    positionClass,
    rcsGrade
  };
};
