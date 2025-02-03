export interface SamplingConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface SamplingStrategyDefinition {
  id: string;
  name: string;
  requiresConfig: boolean;
  configFields?: SamplingConfigField[];
}

export interface SamplingConfig {
  strategy: string;
  config: Record<string, string | number | boolean>;
}
