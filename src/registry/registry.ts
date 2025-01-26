import { SamplingStrategy, SamplingStrategyFactory } from '../types/sampling.js';

export class SamplingStrategyRegistry {
  private static instance: SamplingStrategyRegistry;
  private strategies = new Map<string, SamplingStrategyFactory>();

  private constructor() {}

  static getInstance(): SamplingStrategyRegistry {
    if (!this.instance) {
      this.instance = new SamplingStrategyRegistry();
    }
    return this.instance;
  }

  register(name: string, factory: SamplingStrategyFactory): void {
    this.strategies.set(name, factory);
  }

  create(name: string, config: Record<string, unknown>): SamplingStrategy {
    const factory = this.strategies.get(name);
    if (!factory) {
      throw new Error(`Unknown sampling strategy: ${name}`);
    }
    return factory(config);
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}
