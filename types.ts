export type DataRow = Record<string, any>;

export interface ColumnStat {
  missingCount: number;
  type: 'numeric' | 'categorical';
  stats?: {
    mean: number;
    median: number;
    mode: number[];
    stdDev: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    iqr: number;
  };
  outliers: DataRow[];
}

export type SamplingMethod = 'random' | 'systematic' | 'stratified';
export type PreviewType = 'first' | 'last' | 'random';


// A specific type for categorical strata
export interface CategoricalStratum {
  value: string; // The category itself, e.g., 'Product A'
  count: number;
  sampleSize: number | string;
  error?: string;
}

// A type for rule-based numeric strata
export type NumericConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';

export interface NumericStratum {
  id: string; // Unique ID, or 'other' for the remainder
  operator?: NumericConditionOperator; // Undefined for 'other'
  value?: number; // Undefined for 'other'
  label: string; // e.g., "> 5000" or "الباقي"
  count: number;
  sampleSize: number | string;
  error?: string;
}


export interface StratificationLevel {
  id: number;
  column: string;
  columnType: 'numeric' | 'categorical';
  // The strata array can hold either type, discriminated by the level's columnType.
  // We'll use type assertions in the component.
  strata: (CategoricalStratum | NumericStratum)[];
}

export interface SamplingConfig {
  method: SamplingMethod;
  sampleSize: number;
  isPercentage: boolean;
  systematicInterval: number;
  stratificationLevels: StratificationLevel[];
}

// New types for advanced filtering
export type NumericFilterCondition = 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between';

export interface CategoricalFilter {
  type: 'categorical';
  values: Set<any>;
}

export interface NumericFilter {
  type: 'numeric';
  condition: NumericFilterCondition;
  value1: number | null;
  value2: number | null;
}

export type Filter = CategoricalFilter | NumericFilter;

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}
