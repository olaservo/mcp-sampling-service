import { CreateMessageRequest, CreateMessageResult } from "@modelcontextprotocol/sdk/types";
import { SamplingStrategyFactory } from '../types/sampling.js';
import { ModelSelector, ModelConfig } from './model-selector.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultModelsConfig = JSON.parse(
  readFileSync(join(__dirname, '../config/default-models.json'), 'utf-8')
);

interface OpenRouterResponse {
  model: string;
  choices: Array<{
    finish_reason: string;
    message: {
      content: string;
    };
  }>;
}

export interface OpenRouterSamplingConfig extends Record<string, unknown> {
  allowedModels?: ModelConfig[];
}

function isOpenRouterConfig(config: Record<string, unknown>): config is OpenRouterSamplingConfig {
  return typeof config === 'object' 
    && config !== null 
    && (!('allowedModels' in config) || (Array.isArray(config.allowedModels) && 
        config.allowedModels.every(model => 
          typeof model === 'object' 
          && 'id' in model 
          && 'speedScore' in model 
          && 'intelligenceScore' in model 
          && 'costScore' in model
        )));
}

export const openRouterStrategy: SamplingStrategyFactory = (config: Record<string, unknown>) => {
  if (!isOpenRouterConfig(config)) {
    throw new Error('Invalid OpenRouter sampling configuration. Expected openRouterApiKey string.');
  }

  const modelSelector = new ModelSelector(
    env.OPENROUTER_API_KEY,
    config.allowedModels || defaultModelsConfig.allowedModels
  );

  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

  return {
    handleSamplingRequest: async (request: CreateMessageRequest): Promise<CreateMessageResult> => {
      const messages = request.params.messages.map((msg: { role: string; content: { type: string; text?: string; data?: string } }) => ({
        role: msg.role,
        content: msg.content.type === 'text' ? msg.content.text : msg.content.data
      }));

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'MCP Sampling Service'
        },
        body: JSON.stringify({
          model: request.params.modelPreferences?.model || 
            await modelSelector.selectModel(
              request.params.modelPreferences || {},
              {
                prompt: messages[messages.length - 1].content,
                maxTokens: request.params.maxTokens,
                temperature: request.params.temperature,
                stopSequences: request.params.stopSequences
              }
            ),
          messages,
          max_tokens: request.params.maxTokens || 1000,
          temperature: request.params.temperature || 0.7,
          stop: request.params.stopSequences
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const result = await response.json() as OpenRouterResponse;
      
      return {
        model: result.model,
        stopReason: result.choices[0].finish_reason || 'stop',
        role: 'assistant',
        content: {
          type: 'text',
          text: result.choices[0].message.content
        }
      };
    }
  };
};
