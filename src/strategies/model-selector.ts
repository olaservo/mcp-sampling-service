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

  private scoreModel(model: OpenRouterModel, prefs: ModelPreferences, params: SamplingParameters): number {
    const modelConfig = this.modelConfigs.get(model.id);
    if (!modelConfig) return -1;
    
    let score = 0;
    
    // Context length requirements
    const requiredContext = (params.prompt?.length || 0) + (params.maxTokens || 0);
    if (requiredContext > model.context_length) {
      return -1;
    }

    // Process model hints first
    if (prefs.hints?.length) {
      let matchesHint = false;
      for (const hint of prefs.hints) {
        if (hint.name && model.id.toLowerCase().includes(hint.name.toLowerCase())) {
          matchesHint = true;
          score += 100; // High score for matching hints
          break;
        }
      }
      if (!matchesHint) {
        return -1; // Disqualify if no hints match
      }
    }
    
    // Cost priority scoring
    if (prefs.costPriority) {
      score += modelConfig.costScore * (prefs.costPriority * 50);
    }
    
    // Speed priority scoring
    if (prefs.speedPriority) {
      score += modelConfig.speedScore * (prefs.speedPriority * 30);
    }
    
    // Intelligence priority scoring 
    if (prefs.intelligencePriority) {
      score += modelConfig.intelligenceScore * (prefs.intelligencePriority * 40);
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
    
    let bestScore = -Infinity;
    let bestModel = null;
    
    for (const model of models) {
      if (this.allowedModels.size > 0 && !this.allowedModels.has(model.id)) {
        continue;
      }
      const score = this.scoreModel(model, prefs, params);
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }
    
    if (!bestModel || bestScore === -1) {
      // If no suitable model found based on preferences, fall back to default
      return env.DEFAULT_MODEL_NAME;
    }
    
    return bestModel.id;
  }
}
