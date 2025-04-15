interface ModelPreferences {
  model?: string;
  hints?: ModelHint[];
  costPriority?: number;
  speedPriority?: number;
  intelligencePriority?: number;
  extendedThinkingRequired?: boolean;
}

interface ModelHint {
  name?: string;
  [key: string]: unknown;
}

interface SamplingParameters {
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface AnthropicModelConfig {
  id: string;
  speedScore: number;
  intelligenceScore: number;
  costScore: number;
  contextWindow: number;
  supportsExtendedThinking: boolean;
}

// Default model configurations based on documentation
const DEFAULT_MODELS: AnthropicModelConfig[] = [
  {
    id: "claude-3-7-sonnet-latest",
    speedScore: 0.8, // Fast but not fastest
    intelligenceScore: 1.0, // Most intelligent
    costScore: 0.7, // Mid-range cost
    contextWindow: 200000,
    supportsExtendedThinking: true
  },
  {
    id: "claude-3-5-haiku-latest",
    speedScore: 1.0, // Fastest
    intelligenceScore: 0.7, // Good but not best
    costScore: 0.9, // Very cost effective
    contextWindow: 200000,
    supportsExtendedThinking: false
  },
  {
    id: "claude-3-5-sonnet-latest",
    speedScore: 0.8, // Fast
    intelligenceScore: 0.9, // Very intelligent
    costScore: 0.7, // Mid-range cost
    contextWindow: 200000,
    supportsExtendedThinking: false
  },
  {
    id: "claude-3-opus-latest",
    speedScore: 0.6, // Moderately fast
    intelligenceScore: 0.95, // Very high intelligence
    costScore: 0.3, // Most expensive
    contextWindow: 200000,
    supportsExtendedThinking: false
  }
];

export class AnthropicModelSelector {
  private modelConfigs: Map<string, AnthropicModelConfig>;
  private defaultModel: string;
  
  constructor(modelConfigs: AnthropicModelConfig[] = DEFAULT_MODELS, defaultModel: string = "claude-3-5-sonnet-latest") {
    this.defaultModel = defaultModel;
    this.modelConfigs = new Map(modelConfigs.map(config => [config.id, config]));
  }

  private meetsContextRequirements(model: AnthropicModelConfig, params: SamplingParameters): boolean {
    const requiredContext = (params.prompt?.length || 0) + (params.maxTokens || 0);
    return requiredContext <= model.contextWindow;
  }

  private meetsExtendedThinkingRequirement(model: AnthropicModelConfig, prefs: ModelPreferences): boolean {
    return !prefs.extendedThinkingRequired || model.supportsExtendedThinking;
  }

  private scoreModel(model: AnthropicModelConfig, prefs: ModelPreferences): number {
    let score = 0;
    const BASE_WEIGHT = 100;
    
    // Priority-based scoring
    if (prefs.costPriority) {
      score += model.costScore * (prefs.costPriority * BASE_WEIGHT);
    }
    
    if (prefs.speedPriority) {
      score += model.speedScore * (prefs.speedPriority * BASE_WEIGHT);
    }
    
    if (prefs.intelligencePriority) {
      score += model.intelligenceScore * (prefs.intelligencePriority * BASE_WEIGHT);
    }

    // Bonus for extended thinking support if required
    if (prefs.extendedThinkingRequired && model.supportsExtendedThinking) {
      score += BASE_WEIGHT;
    }

    return score;
  }

  public selectModel(prefs: ModelPreferences, params: SamplingParameters): string {
    // If specific model requested and it exists, return it
    if (prefs.model && this.modelConfigs.has(prefs.model)) {
      return prefs.model;
    }

    // If no specific preferences are provided, return the default model
    if (!prefs.hints?.length && 
        !prefs.costPriority && 
        !prefs.speedPriority && 
        !prefs.intelligencePriority &&
        !prefs.extendedThinkingRequired) {
      return this.defaultModel;
    }

    // Filter models based on basic requirements
    const eligibleModels = Array.from(this.modelConfigs.values()).filter(model => 
      this.meetsContextRequirements(model, params) &&
      this.meetsExtendedThinkingRequirement(model, prefs)
    );

    if (eligibleModels.length === 0) {
      return this.defaultModel;
    }

    // Process hints in order
    if (prefs.hints?.length) {
      for (const hint of prefs.hints) {
        if (!hint.name) continue;
        
        const matchingModels = eligibleModels.filter(model => 
          model.id.toLowerCase().includes(hint.name!.toLowerCase())
        );

        if (matchingModels.length > 0) {
          // Found models matching this hint, score only these models
          let bestScore = -Infinity;
          let bestModel = null;
          
          for (const model of matchingModels) {
            const score = this.scoreModel(model, prefs);
            if (score > bestScore) {
              bestScore = score;
              bestModel = model;
            }
          }
          
          return bestModel?.id || this.defaultModel;
        }
        // If no models match this hint, continue to next hint
      }
    }

    // If no hints matched or no hints provided, score all eligible models
    let bestScore = -Infinity;
    let bestModel = null;
    
    for (const model of eligibleModels) {
      const score = this.scoreModel(model, prefs);
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }
    
    return bestModel?.id || this.defaultModel;
  }
}
