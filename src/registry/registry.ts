import { SamplingStrategy, SamplingStrategyFactory } from '../types/sampling.js';
import { SamplingStrategyDefinition } from '../types/strategy.js';

export class SamplingStrategyRegistry {
  private static instance: SamplingStrategyRegistry;
  private strategies = new Map<string, {
    factory: SamplingStrategyFactory;
    definition: SamplingStrategyDefinition;
  }>();

  private constructor() {}

  static getInstance(): SamplingStrategyRegistry {
    if (!this.instance) {
      this.instance = new SamplingStrategyRegistry();
    }
    return this.instance;
  }

  register(name: string, factory: SamplingStrategyFactory, definition: SamplingStrategyDefinition): void {
    this.strategies.set(name, { factory, definition });
  }

  create(name: string, config: Record<string, unknown>): SamplingStrategy {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Unknown sampling strategy: ${name}`);
    }
    return strategy.factory(config);
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  getStrategyDefinitions(): SamplingStrategyDefinition[] {
    return Array.from(this.strategies.values()).map(s => s.definition);
  }
}
