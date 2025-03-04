import { CreateMessageRequest, CreateMessageResult } from "@modelcontextprotocol/sdk/types";
import { SamplingStrategyFactory } from '../types/sampling.js';
import { SamplingStrategyDefinition } from '../types/strategy.js';
import { OpenRouterModelSelector, ModelConfig } from './openrouter-model-selector.js';
export const OPENROUTER_CONFIG_DEFINITION: SamplingStrategyDefinition = {
  id: 'openrouter',
  name: 'OpenRouter',
  requiresConfig: true,
  configFields: [
    {
      name: 'defaultModel',
      type: 'string',
      label: 'Default Model',
      required: true
    }
  ]
};

export interface OpenRouterStrategyConfig {
  apiKey: string;
  defaultModel: string;
  allowedModels?: ModelConfig[];
}

interface OpenRouterResponse {
  model: string;
  choices: Array<{
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
}

function isOpenRouterConfig(config: unknown): config is OpenRouterStrategyConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const { apiKey, defaultModel, allowedModels } = config as Partial<OpenRouterStrategyConfig>;

  if (typeof apiKey !== 'string' || typeof defaultModel !== 'string') {
    return false;
  }

  if (allowedModels !== undefined) {
    if (!Array.isArray(allowedModels)) {
      return false;
    }
    return allowedModels.every(model => 
      typeof model === 'object' 
      && model !== null
      && typeof model.id === 'string'
      && typeof model.speedScore === 'number'
      && typeof model.intelligenceScore === 'number'
      && typeof model.costScore === 'number'
    );
  }

  return true;
}

export const openRouterStrategy: SamplingStrategyFactory = (config: Record<string, unknown>) => {
  if (!isOpenRouterConfig(config)) {
    throw new Error('Invalid OpenRouter configuration. Required: apiKey (string), defaultModel (string)');
  }

  const modelSelector = new OpenRouterModelSelector(
    config.apiKey,
    config.allowedModels || [],
    config.defaultModel
  );

  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

  return {
    handleSamplingRequest: async (request: CreateMessageRequest): Promise<CreateMessageResult> => {
      // Initialize with system prompt if it exists
      const messages = request.params.systemPrompt 
        ? [{
            role: 'system',
            content: request.params.systemPrompt
          }]
        : [];
      
      // Add user messages with proper type handling
      request.params.messages.forEach((msg: { role: string; content: { type: string; text?: string; data?: string } }) => {
        const content = msg.content.type === 'text' ? msg.content.text : msg.content.data;
        if (content) {
          messages.push({
            role: msg.role,
            content: content
          });
        }
      });

      const requestBody = {
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
        max_tokens: request.params.maxTokens || 8192,
        temperature: request.params.temperature || 0.4,
        stop: request.params.stopSequences
      };

      console.log('OpenRouter Request URL:', OPENROUTER_API_URL);
      console.log('OpenRouter Request Headers:', {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'MCP Sampling Service'
        // Authorization header excluded for security
      });
      console.log('OpenRouter Request Body:', requestBody);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'MCP Sampling Service'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const result = await response.json() as OpenRouterResponse;
      console.log('OpenRouter Response Status:', response.status);
      console.log('OpenRouter Response:', result);
      
      // Log the full response structure for debugging
      console.log('Full Response Structure:', JSON.stringify(result, null, 2));
      console.log('Message Object:', JSON.stringify(result.choices[0].message, null, 2));
      
      const responseResult: CreateMessageResult = {
        model: result.model,
        stopReason: result.choices[0].finish_reason || 'stop',
        role: 'assistant',
        content: {
          type: 'text',
          text: result.choices[0].message.content
        }
      };

      return responseResult;
    },

    handleStreamingSamplingRequest: async (
      request: CreateMessageRequest, 
      onChunk: (chunk: Partial<CreateMessageResult>) => void
    ): Promise<void> => {
      // Initialize with system prompt if it exists
      const messages = request.params.systemPrompt 
        ? [{
            role: 'system',
            content: request.params.systemPrompt
          }]
        : [];
      
      // Add user messages with proper type handling
      request.params.messages.forEach((msg: { role: string; content: { type: string; text?: string; data?: string } }) => {
        const content = msg.content.type === 'text' ? msg.content.text : msg.content.data;
        if (content) {
          messages.push({
            role: msg.role,
            content: content
          });
        }
      });

      const requestBody = {
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
        max_tokens: request.params.maxTokens || 8192,
        temperature: request.params.temperature || 0.4,
        stop: request.params.stopSequences,
        stream: true // Enable streaming
      };

      console.log('OpenRouter Streaming Request URL:', OPENROUTER_API_URL);
      console.log('OpenRouter Streaming Request Headers:', {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'MCP Sampling Service'
        // Authorization header excluded for security
      });
      console.log('OpenRouter Streaming Request Body:', requestBody);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'MCP Sampling Service'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let model = '';
      let fullText = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              // Check for [DONE] message
              if (data.trim() === '[DONE]') {
                continue;
              }
              
              try {
                const json = JSON.parse(data);
                
                // Extract model info from the first chunk if available
                if (json.model && !model) {
                  model = json.model;
                }
                
                // Extract content delta
                const delta = json.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullText += delta;
                  
                  // Send the chunk to the callback with just the delta
                  onChunk({
                    model,
                    role: json.choices?.[0]?.delta?.role || 'assistant',
                    content: {
                      type: 'text',
                      text: delta
                    }
                  });
                }
                
                // Check for finish reason
                if (json.choices?.[0]?.finish_reason) {
                  onChunk({
                    stopReason: json.choices[0].finish_reason
                  });
                }
              } catch (e) {
                console.error('Error parsing streaming response chunk:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  };
};
