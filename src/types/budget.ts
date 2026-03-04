// Budget Cap configuration types for Phase 6C

export type BudgetMode = 'percent' | 'fixed';

export interface BudgetConfig {
  mode: BudgetMode;
  percent_cap: number;   // 0–1 fraction (e.g. 0.03 = 3%)
  fixed_cap_local: number; // absolute amount in local currency
}

export interface BudgetSummary {
  spent: number;
  cap: number;
  remaining: number;
  pctUsed: number;       // 0–1+ fraction
  isOverBudget: boolean;
  baseTotal: number;     // total guaranteed / fallback base used for % mode
  baseMissing: boolean;  // true if base fields are incomplete
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  mode: 'percent',
  percent_cap: 0.03,
  fixed_cap_local: 0,
};
