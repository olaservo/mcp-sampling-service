export interface SamplingConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label: string;
  placeholder?: string;
  required: boolean;
  schema?: {
    type: string;
    items?: {
      type: string;
      properties?: Record<string, {
        type: string;
        min?: number;
        max?: number;
      }>;
      required?: string[];
    };
  };
}

export interface SamplingStrategyDefinition {
  id: string;
  name: string;
  requiresConfig: boolean;
  configFields?: SamplingConfigField[];
}

export interface SamplingConfig {
  strategy: string;
  config: Record<string, unknown>;
}
