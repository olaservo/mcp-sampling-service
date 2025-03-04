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

export interface OpenRouterToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenRouterResponse {
  model: string;
  choices: Array<{
    finish_reason: string;
    message: {
      role: string;
      content: string;
      tool_calls?: OpenRouterToolCall[];
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
        stop: request.params.stopSequences,
        tools: request.params.tools,
        tool_choice: request.params.toolChoice
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

      // Debug logs for tool call extraction
      console.log('Finish reason:', result.choices[0].finish_reason);
      console.log('Has tool_calls property:', !!result.choices[0].message.tool_calls);
      if (result.choices[0].message.tool_calls) {
        console.log('Tool calls length:', result.choices[0].message.tool_calls.length);
      }
      
      // Extract tool calls if present
      if (result.choices[0].finish_reason === 'tool_calls' && 
          result.choices[0].message.tool_calls && 
          result.choices[0].message.tool_calls.length > 0) {
        console.log('Tool calls found in response:', JSON.stringify(result.choices[0].message.tool_calls, null, 2));
        responseResult.toolCalls = result.choices[0].message.tool_calls;
      } else {
        console.log('No tool calls found in response');
      }
      
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
        tools: request.params.tools,
        tool_choice: request.params.toolChoice,
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
      let accumulatedToolCalls: Record<string, any> = {};

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
                  
                  // Send the chunk to the callback
                  onChunk({
                    model,
                    role: 'assistant',
                    content: {
                      type: 'text',
                      text: fullText // Send the accumulated text so far
                    }
                  });
                }
                
                // Check for tool calls in the delta
                if (json.choices?.[0]?.delta?.tool_calls) {
                  const toolCallsChunk = json.choices[0].delta.tool_calls;
                  console.log('Tool calls found in streaming chunk:', JSON.stringify(toolCallsChunk, null, 2));
                  
                  // Process each tool call in the chunk
                  toolCallsChunk.forEach((toolCallChunk: any) => {
                    const index = toolCallChunk.index;
                    
                    // Initialize the tool call if it doesn't exist
                    if (!accumulatedToolCalls[index]) {
                      accumulatedToolCalls[index] = {
                        id: toolCallChunk.id,
                        index,
                        type: toolCallChunk.type,
                        function: {
                          name: toolCallChunk.function?.name,
                          arguments: ''
                        }
                      };
                    }
                    
                    // Update the tool call with new information
                    if (toolCallChunk.id) {
                      accumulatedToolCalls[index].id = toolCallChunk.id;
                    }
                    if (toolCallChunk.type) {
                      accumulatedToolCalls[index].type = toolCallChunk.type;
                    }
                    if (toolCallChunk.function) {
                      if (toolCallChunk.function.name) {
                        accumulatedToolCalls[index].function.name = toolCallChunk.function.name;
                      }
                      if (toolCallChunk.function.arguments) {
                        accumulatedToolCalls[index].function.arguments += toolCallChunk.function.arguments;
                      }
                    }
                  });
                  
                  // Convert the accumulated tool calls to an array
                  const toolCallsArray = Object.values(accumulatedToolCalls);
                  
                  // Send the accumulated tool calls to the callback
                  onChunk({
                    toolCalls: toolCallsArray
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
