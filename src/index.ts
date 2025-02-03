import './config/env.js';
import { SamplingStrategyRegistry } from './registry/index.js';
import { stubStrategy } from './strategies/stub.js';
import { openRouterStrategy } from './strategies/openrouter.js';
import type { SamplingStrategyFactory, SamplingStrategy } from './types/sampling.js';
import type { SamplingStrategyDefinition } from './types/strategy.js';

export { SamplingStrategyRegistry };
export { stubStrategy };
export { openRouterStrategy };
export type { OpenRouterSamplingConfig } from './strategies/openrouter.js';
export type { ModelConfig } from './strategies/openrouter-model-selector.js';
export type {
  SamplingStrategy,
  SamplingStrategyFactory,
  SamplingParams,
  ModelPreferences,
  TextContent,
  ImageContent,
  CreateMessageRequest,
  CreateMessageResult
} from './types/sampling.js';
export type {
  SamplingConfigField,
  SamplingStrategyDefinition,
  SamplingConfig
} from './types/strategy.js';

export const defaultStrategies: Record<string, {
  factory: SamplingStrategyFactory;
  definition: SamplingStrategyDefinition;
}> = {
  stub: {
    factory: stubStrategy,
    definition: {
      id: "stub",
      name: "Stub Response",
      requiresConfig: false
    }
  },
  openrouter: {
    factory: openRouterStrategy,
    definition: {
      id: "openrouter",
      name: "Open Router Strategy",
      requiresConfig: false
    }
  }
};

export function initializeSamplingService(options?: {
  useDefaultStrategies?: boolean;
  additionalStrategies?: Record<string, {
    factory: SamplingStrategyFactory;
    definition: SamplingStrategyDefinition;
  }>;
}) {
  const registry = SamplingStrategyRegistry.getInstance();
  
  if (options?.useDefaultStrategies !== false) {
    Object.entries(defaultStrategies).forEach(([name, strategy]) => {
      registry.register(name, strategy.factory, strategy.definition);
    });
  }
  
  if (options?.additionalStrategies) {
    Object.entries(options.additionalStrategies).forEach(([name, strategy]) => {
      registry.register(name, strategy.factory, strategy.definition);
    });
  }
  
  return registry;
}
