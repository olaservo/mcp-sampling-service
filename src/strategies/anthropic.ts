import { CreateMessageRequest, CreateMessageResult } from "@modelcontextprotocol/sdk/types";
import { SamplingStrategyFactory } from '../types/sampling.js';
import { SamplingStrategyDefinition } from '../types/strategy.js';
import Anthropic from '@anthropic-ai/sdk';

export const ANTHROPIC_CONFIG_DEFINITION: SamplingStrategyDefinition = {
  id: 'anthropic',
  name: 'Anthropic',
  requiresConfig: true,
  configFields: [
    {
      name: 'model',
      type: 'string',
      label: 'Model',
      placeholder: 'claude-3-5-sonnet-latest',
      required: true
    }
  ]
};

export interface AnthropicStrategyConfig {
  apiKey: string;
  model: string;
}

function isAnthropicConfig(config: unknown): config is AnthropicStrategyConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const { apiKey, model } = config as Partial<AnthropicStrategyConfig>;

  return typeof apiKey === 'string' && typeof model === 'string';
}

export const anthropicStrategy: SamplingStrategyFactory = (config: Record<string, unknown>) => {
  if (!isAnthropicConfig(config)) {
    throw new Error('Invalid Anthropic configuration. Required: apiKey (string), model (string)');
  }

  const client = new Anthropic({
    apiKey: config.apiKey
  });

  return {
    handleSamplingRequest: async (request: CreateMessageRequest): Promise<CreateMessageResult> => {
      // Convert messages to Anthropic format
      const messages: Anthropic.MessageParam[] = [];
      
      // Add user messages with proper type handling
      request.params.messages.forEach((msg: { role: string; content: { type: string; text?: string; data?: string } }) => {
        const content = msg.content.type === 'text' ? msg.content.text : msg.content.data;
        if (content) {
          // Only include user and assistant messages
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role,
              content: content
            });
          }
        }
      });

      // If there's a system prompt, add it as a user message at the start
      if (request.params.systemPrompt) {
        messages.unshift({
          role: 'user',
          content: request.params.systemPrompt
        });
      }

      const messageParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model: (request.params.modelPreferences?.model || config.model) as Anthropic.Messages.Message['model'],
        messages,
        max_tokens: request.params.maxTokens || 1024,
        temperature: request.params.temperature || 0.7,
        stream: false
      };

      // Add stop sequences if provided
      if (request.params.stopSequences?.length) {
        (messageParams as any).stop = request.params.stopSequences;
      }

      const message = await client.messages.create(messageParams);
      const textBlock = message.content.find((block): block is Anthropic.TextBlock => 'type' in block && block.type === 'text');
      const textContent = textBlock?.text || '';

      return {
        model: message.model,
        stopReason: message.stop_reason || 'stop',
        role: 'assistant',
        content: {
          type: 'text',
          text: textContent
        }
      };
    }
  };
};
