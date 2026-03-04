
import { OrganizationFieldsData } from "./organizationFields";

export interface Dimension {
  value: number;
  points: number;
}

export interface Dimensions {
  impact: Dimension;
  communication: Dimension;
  innovation: Dimension;
  knowledge: Dimension;
  risk: Dimension;
  operational: Dimension;
}

export interface EvaluationResult {
  totalPoints: number;
  grade: string;
  level: string;
  // Make all these properties required instead of optional to match calculatorUtils.ts
  pointsImpactContribution: number;
  pointsSize: number;
  pointsCommunicationFrame: number;
  pointsInnovationComplexity: number;
  pointsKnowledgeTeams: number;
  pointsBreadth: number;
  pointsRiskEnvironment: number;
  positionClass: number;
  rcsGrade: string;
}

export interface Position extends OrganizationFieldsData {
  jobTitle: string;
  dimensions: Dimensions;
  result?: EvaluationResult;
  // Add the direct evaluation fields that are being used
  impact?: number;
  contribution?: number;
  size?: number;
  communication?: number;
  frame?: number;
  innovation?: number;
  complexity?: number;
  knowledge?: number;
  teams?: number;
  breadth?: number;
  risk?: number;
  environment?: number;
}
