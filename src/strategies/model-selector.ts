interface ModelPreferences {
  model?: string;
  hints?: ModelHint[];
  costPriority?: number;
  speedPriority?: number;
  intelligencePriority?: number;
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

// Minimal OpenAI client interface for what we need
class OpenAI {
  private baseURL: string;
  private apiKey: string;

  constructor(config: { baseURL: string; apiKey: string }) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
  }

  async get(path: string): Promise<{ data: { data: OpenRouterModel[] } }> {
    const response = await fetch(`${this.baseURL}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }
    const data = await response.json();
    return { data: data as { data: OpenRouterModel[] } };
  }
}

interface OpenRouterModel {
  id: string;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
}

export interface ModelConfig {
  id: string;
  speedScore: number;
  intelligenceScore: number;
  costScore: number;
}

import { env } from '../config/env.js';

export class ModelSelector {
  private openai: OpenAI;
  private modelCache: OpenRouterModel[] = [];
  private allowedModels: Set<string>;
  private modelConfigs: Map<string, ModelConfig>;
  
  constructor(apiKey: string, modelConfigs: ModelConfig[]) {
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey
    });
    this.allowedModels = new Set(modelConfigs.map(config => config.id));
    this.modelConfigs = new Map(modelConfigs.map(config => [config.id, config]));
  }

  private async getModels(): Promise<OpenRouterModel[]> {
    if (this.modelCache.length > 0) return this.modelCache;
    
    const response = await this.openai.get("/models");
    this.modelCache = response.data.data;
    return this.modelCache;
  }

  private matchesHints(model: OpenRouterModel, hints?: ModelHint[]): boolean {
    if (!hints?.length) return true;
    
    for (const hint of hints) {
      if (hint.name && model.id.toLowerCase().includes(hint.name.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private meetsContextRequirements(model: OpenRouterModel, params: SamplingParameters): boolean {
    const requiredContext = (params.prompt?.length || 0) + (params.maxTokens || 0);
    return requiredContext <= model.context_length;
  }

  private scoreModel(model: OpenRouterModel, prefs: ModelPreferences): number {
    const modelConfig = this.modelConfigs.get(model.id);
    if (!modelConfig) return -1;
    
    let score = 0;
    
    const BASE_WEIGHT = 100;
    
    // Pure priority-based scoring without hint influence
    if (prefs.costPriority) {
      score += modelConfig.costScore * (prefs.costPriority * BASE_WEIGHT);
    }
    
    if (prefs.speedPriority) {
      score += modelConfig.speedScore * (prefs.speedPriority * BASE_WEIGHT);
    }
    
    if (prefs.intelligencePriority) {
      score += modelConfig.intelligenceScore * (prefs.intelligencePriority * BASE_WEIGHT);
    }

    return score;
  }

  public async selectModel(prefs: ModelPreferences, params: SamplingParameters): Promise<string> {
    // If no specific preferences are provided, return the default model
    if (!prefs.model && !prefs.hints?.length && 
        !prefs.costPriority && !prefs.speedPriority && !prefs.intelligencePriority) {
      return env.DEFAULT_MODEL_NAME;
    }

    const models = await this.getModels();
    
    // Filter models based on requirements first
    const eligibleModels = models.filter(model => 
      this.allowedModels.has(model.id) &&
      this.matchesHints(model, prefs.hints) &&
      this.meetsContextRequirements(model, params)
    );

    if (eligibleModels.length === 0) {
      return env.DEFAULT_MODEL_NAME;
    }

    // Score eligible models
    let bestScore = -Infinity;
    let bestModel = null;
    
    for (const model of eligibleModels) {
      const score = this.scoreModel(model, prefs);
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }
    
    if (!bestModel) {
      return env.DEFAULT_MODEL_NAME;
    }
    
    return bestModel.id;
  }
}
