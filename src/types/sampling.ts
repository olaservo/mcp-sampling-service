import { CreateMessageRequest, CreateMessageResult, SamplingMessage } from "@modelcontextprotocol/sdk/types";

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
  modelPreferences?: {
    hints?: Array<{ name?: string }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
}

export interface CompletionResult {
  model: string;
  content: {
    text: string;
  };
  stopReason?: string;
}

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

export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}
