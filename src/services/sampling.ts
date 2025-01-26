import { SamplingError, SamplingErrorCodes } from '../types/errors.js';
import { SamplingParams, SamplingResponse, MCPTextContent, MCPImageContent } from '../types/sampling.js';
import { env } from '../config/env.js';
import { openRouterStrategy } from '../strategies/openrouter.js';
import { SamplingStrategyFactory } from '../types/sampling.js';

export class SamplingService {
  private strategy: ReturnType<SamplingStrategyFactory>;

  constructor() {
    this.strategy = openRouterStrategy({});  // Use default model configs
  }

  async handleSamplingRequest(params: SamplingParams, requestId: number): Promise<SamplingResponse> {
    try {
      // Validate request parameters
      this.validateRequest(params);

      // Process messages to ensure correct format
      const messages = this.processMessages(params);

      // Make completion request
      const completionResult = await this.makeCompletionRequest(messages, params);

      // Format and return response
      return this.formatSuccessResponse(completionResult, requestId);
    } catch (error) {
      return this.formatErrorResponse(error, requestId);
    }
  }

  private validateRequest(params: SamplingParams): void {
    if (!params.messages?.length) {
      throw new SamplingError(
        SamplingErrorCodes.SamplingError,
        'Messages array is required and cannot be empty'
      );
    }

    if (typeof params.maxTokens !== 'number' || params.maxTokens <= 0) {
      throw new SamplingError(
        SamplingErrorCodes.SamplingError,
        'maxTokens must be a positive number'
      );
    }
  }

  private processMessages(params: SamplingParams): Array<{ [key: string]: unknown; role: "user" | "assistant"; content: { [key: string]: unknown } & (MCPTextContent | MCPImageContent) }> {
    return params.messages.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content.type === 'text'
        ? { type: 'text', text: String(msg.content.text || '') } as { [key: string]: unknown } & MCPTextContent
        : {
            type: 'image',
            data: String(msg.content.data || ''),
            mimeType: msg.content.mimeType || 'image/jpeg'
          } as { [key: string]: unknown } & MCPImageContent
    }));
  }

  private async makeCompletionRequest(
    messages: Array<{ [key: string]: unknown; role: "user" | "assistant"; content: { [key: string]: unknown } & (MCPTextContent | MCPImageContent) }>,
    params: SamplingParams
  ): Promise<{ model: string; content: { text: string }; stopReason?: string }> {
    const result = await this.strategy.handleSamplingRequest({
      method: "sampling/createMessage",
      params: {
        messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature ?? 0.4,
        stopSequences: params.stopSequences,
        modelPreferences: params.modelPreferences,
        systemPrompt: params.systemPrompt,
        includeContext: params.includeContext
      }
    });

    if (typeof result.model !== 'string' || typeof result.content?.text !== 'string') {
      throw new SamplingError(
        SamplingErrorCodes.SamplingError,
        'Invalid response format from strategy'
      );
    }

    return {
      model: result.model,
      content: { text: result.content.text },
      stopReason: result.stopReason || 'stop'
    };
  }

  private formatSuccessResponse(
    result: { model: string; content: { text: string }; stopReason?: string },
    requestId: number
  ): SamplingResponse {
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        model: result.model,
        stopReason: result.stopReason || 'endTurn',
        role: 'assistant',
        content: {
          type: 'text',
          text: result.content.text
        }
      }
    };
  }

  private formatErrorResponse(error: unknown, requestId: number): SamplingResponse {
    console.error('Error handling sampling request:', error);
    
    let errorResponse: { code: number; message: string };
    
    if (error instanceof SamplingError) {
      errorResponse = { code: error.code, message: error.message };
    } else if (error instanceof Error) {
      errorResponse = {
        code: SamplingErrorCodes.SamplingError,
        message: `Failed to handle sampling request: ${error.message}`
      };
    } else {
      errorResponse = {
        code: SamplingErrorCodes.SamplingError,
        message: 'Unknown error handling sampling request'
      };
    }

    return {
      jsonrpc: '2.0',
      id: requestId,
      error: errorResponse
    };
  }
}
