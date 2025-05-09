import { SamplingStrategyRegistry } from './registry/index.js';
import { stubStrategy } from './strategies/stub.js';
import { openRouterStrategy } from './strategies/openrouter.js';
import { anthropicStrategy, ANTHROPIC_CONFIG_DEFINITION } from './strategies/anthropic.js';
import type { SamplingStrategyFactory, SamplingStrategy } from './types/sampling.js';
import type { SamplingStrategyDefinition } from './types/strategy.js';

export { SamplingStrategyRegistry };
export { stubStrategy };
export { openRouterStrategy };
export { anthropicStrategy };
export type { OpenRouterStrategyConfig } from './strategies/openrouter.js';
export type { AnthropicStrategyConfig } from './strategies/anthropic.js';
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
  anthropic: {
    factory: anthropicStrategy,
    definition: ANTHROPIC_CONFIG_DEFINITION
  },
  openrouter: {
    factory: openRouterStrategy,
    definition: {
      id: "openrouter",
      name: "Open Router Strategy",
      requiresConfig: true,
      configFields: [
        {
          name: "apiKey",
          type: "string",
          required: true,
          label: "API Key",
          placeholder: "Your OpenRouter API key"
        },
        {
          name: "defaultModel",
          type: "string",
          required: true,
          label: "Default Model",
          placeholder: "e.g., anthropic/claude-3.5-sonnet"
        },
        {
          name: "allowedModels",
          type: "string",
          required: false,
          label: "Allowed Models",
          placeholder: "JSON array of model configurations"
        }
      ]
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
