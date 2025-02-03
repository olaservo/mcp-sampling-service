import { 
  CreateMessageRequest, 
  CreateMessageResult, 
  SamplingMessage,
  TextContent,
  ImageContent
} from "@modelcontextprotocol/sdk/types";

export interface SamplingResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    model: string;
    stopReason: string;
    role: 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface ModelPreferences extends Record<string, unknown> {
  hints?: Array<{ name?: string }>;
  costPriority?: number;
  speedPriority?: number;
  intelligencePriority?: number;
}

export interface SamplingStrategy {
  handleSamplingRequest(request: CreateMessageRequest): Promise<CreateMessageResult>;
}

export interface SamplingStrategyFactory {
  (config: Record<string, unknown>): SamplingStrategy;
}

export interface SamplingConfig {
  strategy: string;
  config: Record<string, unknown>;
}

export interface SamplingParams {
  messages: SamplingMessage[];
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  modelPreferences?: ModelPreferences;
}

// Re-export SDK types for convenience
export type { TextContent, ImageContent, CreateMessageRequest, CreateMessageResult };
