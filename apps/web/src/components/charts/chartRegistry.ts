/**
 * WealthOS Enterprise Financial Visualization Chart Registry & Type Contracts
 * 
 * Central declarative registry binding canonical backend financial metric domains
 * to responsive frontend chart components, API endpoints, formatters, and accessible fallbacks.
 */

import { formatCurrency, formatPercentage } from '../../lib/formatters';

export type MetricDomain =
  | 'wealth'
  | 'cash'
  | 'budget'
  | 'investment'
  | 'liability'
  | 'planning'
  | 'risk'
  | 'tax'
  | 'household';

export type TimeGrain = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type DataStatus = 'actual' | 'projected' | 'estimated' | 'scenario';

export type ChartType =
  | 'area'
  | 'line'
  | 'bar'
  | 'donut'
  | 'waterfall'
  | 'horizontal_bar'
  | 'heatmap';

export interface DataPoint {
  date: string;
  value: number | string | null;
  available?: boolean;
  status?: DataStatus;
}

export interface SeriesData {
  name: string;
  status?: DataStatus;
  color?: string;
  points: DataPoint[];
}

export interface MetricSummary {
  current_value: number | string;
  previous_value?: number | string | null;
  absolute_change?: number | string | null;
  percentage_change?: number | string | null;
  savings_rate?: number | string | null;
  utilization_rate?: number | string | null;
}

export interface Provenance {
  calculated_at: string;
  source_version: string;
  freshness: string;
  valuation_timestamp?: string | null;
}

export interface MetricMetadata {
  key: string;
  name: string;
  domain: MetricDomain;
  unit: 'currency' | 'percentage' | 'score' | 'count';
  currency: string;
}

export interface PeriodMetadata {
  start: string;
  end: string;
  granularity: TimeGrain;
}

export interface AnalyticsResponseEnvelope {
  metric: MetricMetadata;
  period: PeriodMetadata;
  series: SeriesData[];
  summary: MetricSummary;
  provenance: Provenance;
  warnings?: string[];
}

export interface ChartSpecification {
  id: string;
  metricKey: string;
  title: string;
  subtitle: string;
  chartType: ChartType;
  endpoint: string;
  domain: MetricDomain;
  unit: 'currency' | 'percentage' | 'score' | 'count';
  defaultGranularity: TimeGrain;
  supportsExport: boolean;
  supportsTableFallback: boolean;
}

export const CHART_REGISTRY: Record<string, ChartSpecification> = {
  net_worth: {
    id: 'vis-01-net-worth',
    metricKey: 'net_worth',
    title: 'Consolidated Net Worth',
    subtitle: 'Authoritative assets minus liabilities balance grounded in double-entry ledger',
    chartType: 'area',
    endpoint: '/api/v1/analytics/net-worth',
    domain: 'wealth',
    unit: 'currency',
    defaultGranularity: 'month',
    supportsExport: true,
    supportsTableFallback: true,
  },
  cash_flow: {
    id: 'vis-02-cash-flow',
    metricKey: 'cash_flow',
    title: 'Operating Cash Flow & Savings Velocity',
    subtitle: 'Transfer-neutral operating inflows vs outflows and net savings rate',
    chartType: 'bar',
    endpoint: '/api/v1/analytics/cash-flow',
    domain: 'cash',
    unit: 'currency',
    defaultGranularity: 'month',
    supportsExport: true,
    supportsTableFallback: true,
  },
  income_expenses: {
    id: 'vis-03-income-expenses',
    metricKey: 'income_expenses',
    title: 'Expense Velocity & Temporal Rhythm',
    subtitle: 'Daily spending density patterns across recurring financial cycles',
    chartType: 'heatmap',
    endpoint: '/api/v1/analytics/income-expenses',
    domain: 'cash',
    unit: 'currency',
    defaultGranularity: 'day',
    supportsExport: true,
    supportsTableFallback: true,
  },
  asset_allocation: {
    id: 'vis-04-asset-allocation',
    metricKey: 'asset_allocation',
    title: 'Multi-Asset Portfolio Allocation',
    subtitle: 'Diversified capital distribution across Equities, Mutual Funds, Debt and Gold',
    chartType: 'donut',
    endpoint: '/api/v1/analytics/investments/allocation',
    domain: 'investment',
    unit: 'percentage',
    defaultGranularity: 'month',
    supportsExport: true,
    supportsTableFallback: true,
  },
  budget_utilization: {
    id: 'vis-05-budget-utilization',
    metricKey: 'budget_utilization',
    title: 'Budget Envelopes & Utilization Velocity',
    subtitle: 'Approved monthly spending limits vs actual ledger expenditures',
    chartType: 'horizontal_bar',
    endpoint: '/api/v1/analytics/budgets/utilization',
    domain: 'budget',
    unit: 'percentage',
    defaultGranularity: 'month',
    supportsExport: true,
    supportsTableFallback: true,
  },
  debt_amortization: {
    id: 'vis-06-debt-amortization',
    metricKey: 'debt_amortization',
    title: 'Debt Amortization & Principal Trajectory',
    subtitle: 'Reducing balance installment schedules split by principal reduction and interest cost',
    chartType: 'bar',
    endpoint: '/api/v1/analytics/liabilities/overview',
    domain: 'liability',
    unit: 'currency',
    defaultGranularity: 'month',
    supportsExport: true,
    supportsTableFallback: true,
  },
  wealth_forecast: {
    id: 'vis-07-wealth-forecast',
    metricKey: 'wealth_forecast',
    title: 'Multi-Year Wealth Projections',
    subtitle: 'Inflation-adjusted wealth growth trajectories across conservative, expected and high growth',
    chartType: 'line',
    endpoint: '/api/v1/analytics/planning/forecast',
    domain: 'planning',
    unit: 'currency',
    defaultGranularity: 'year',
    supportsExport: true,
    supportsTableFallback: true,
  },
  financial_health: {
    id: 'vis-08-financial-health',
    metricKey: 'financial_health',
    title: 'Financial Health & Solvency Score',
    subtitle: 'Comprehensive 5-pillar composite solvency index and liquidity resilience',
    chartType: 'line',
    endpoint: '/api/v1/analytics/risks/overview',
    domain: 'risk',
    unit: 'score',
    defaultGranularity: 'month',
    supportsExport: true,
    supportsTableFallback: true,
  },
};

/**
 * Format any financial metric value using authoritative Indian notation and unit semantics.
 */
export function formatAnalyticalValue(
  value: number | string | null | undefined,
  unit: 'currency' | 'percentage' | 'score' | 'count',
  currency: string = 'INR',
  compact: boolean = false
): string {
  if (value === null || value === undefined) return '—';
  const numericVal = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericVal)) return '—';

  switch (unit) {
    case 'currency':
      return formatCurrency(numericVal, {
        currency,
        notation: compact ? 'compact' : 'standard',
      });
    case 'percentage':
      return formatPercentage(numericVal, { decimals: 1, showSign: false });
    case 'score':
      return `${Math.round(numericVal)}/100`;
    case 'count':
      return Math.round(numericVal).toLocaleString('en-IN');
    default:
      return String(numericVal);
  }
}
