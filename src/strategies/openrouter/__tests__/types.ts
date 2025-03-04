export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    finish_reason: string;
    message: {
      role: 'assistant' | 'user';
      content: string | null | { type: string; text: string };
    };
  }>;
  created: number;
  object: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterStreamingChunk {
  id: string;
  choices: Array<{
    finish_reason: string | null;
    delta: {
      role?: string;
      content?: string | null | { type: string; text: string };
    };
  }>;
  model: string;
  object: string;
}

export interface StreamingChunk {
  role?: "user" | "assistant";
  content?: {
    type: "text";
    text: string;
  };
  stopReason?: string;
  model?: string;
}
