
// Export all lookup tables from a single file

import { impactContributionTable } from './impactContributionTable';
import { communicationFrameTable } from './communicationFrameTable';
import { innovationComplexityTable } from './innovationComplexityTable';
import { knowledgeTeamsTable } from './knowledgeTeamsTable';
import { breadthTable } from './breadthTable';
import { riskEnvironmentTable } from './riskEnvironmentTable';
import { rcsGradeTable } from './rcsGradeTable';

// Combine all tables into a single export
export const lookupTables = {
  impactContribution: impactContributionTable,
  communicationFrame: communicationFrameTable,
  innovationComplexity: innovationComplexityTable,
  knowledgeTeams: knowledgeTeamsTable,
  breadth: breadthTable,
  riskEnvironment: riskEnvironmentTable,
  rcsGrade: rcsGradeTable
};
