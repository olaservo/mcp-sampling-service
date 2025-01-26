import { SamplingError, SamplingErrorCodes } from '../types/errors.js';
import { SamplingParams, SamplingResponse, MCPTextContent, MCPImageContent } from '../types/sampling.js';
import { env } from '../config/env.js';

export class SamplingService {

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

  private processMessages(params: SamplingParams): Array<{ role: string; content: MCPTextContent | MCPImageContent }> {
    return params.messages.map(msg => ({
      role: msg.role,
      content: msg.content.type === 'text'
        ? { type: 'text', text: msg.content.text || '' } as MCPTextContent
        : {
            type: 'image',
            data: msg.content.data || '',
            mimeType: msg.content.mimeType || 'image/jpeg'
          } as MCPImageContent
    }));
  }

  private async makeCompletionRequest(
    messages: Array<{ role: string; content: MCPTextContent | MCPImageContent }>,
    params: SamplingParams
  ): Promise<{ model: string; content: { text: string }; stopReason?: string }> {
    const response = await fetch('http://localhost:3001/api/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.DEFAULT_MODEL_NAME,
        messages,
        config: {
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          stopSequences: params.stopSequences,
          modelPreferences: params.modelPreferences
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SamplingError(
        SamplingErrorCodes.SamplingError,
        `Failed to get completion: ${errorText}`
      );
    }

    const data = await response.json();
    
    // Type guard for completion result
    if (typeof data === 'object' && data !== null &&
        'model' in data && typeof data.model === 'string' &&
        'content' in data && typeof data.content === 'object' && data.content !== null &&
        'text' in data.content && typeof data.content.text === 'string') {
      const result = data as { 
        model: string; 
        content: { text: string }; 
        stopReason?: string 
      };
      return {
        model: result.model,
        content: { text: result.content.text },
        stopReason: result.stopReason
      };
    }
    
    throw new SamplingError(
      SamplingErrorCodes.SamplingError,
      'Invalid completion response format'
    );
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
