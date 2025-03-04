import { OpenRouterResponse, OpenRouterStreamingChunk } from '../types';

/**
 * Mock response for a basic text completion
 */
export const basicCompletionResponse: OpenRouterResponse = {
  id: "gen-test-basic",
  choices: [{
    finish_reason: "stop",
    message: {
      role: "assistant",
      content: "Hello there!"
    }
  }],
  created: 1709492400, // 2025-03-03T17:00:00.000Z
  model: "anthropic/claude-3-opus-20240229",
  object: "chat.completion",
  usage: {
    prompt_tokens: 10,
    completion_tokens: 4,
    total_tokens: 14
  }
};

/**
 * Mock response for length finish reason
 */
export const lengthFinishResponse: OpenRouterResponse = {
  id: "gen-test-length",
  choices: [{
    finish_reason: "length",
    message: {
      role: "assistant",
      content: "This response was cut off due to length..."
    }
  }],
  created: 1709492400,
  model: "anthropic/claude-3-opus-20240229",
  object: "chat.completion",
  usage: {
    prompt_tokens: 20,
    completion_tokens: 12,
    total_tokens: 32
  }
};

/**
 * Mock response for content filter finish reason
 */
export const contentFilterResponse: OpenRouterResponse = {
  id: "gen-test-filter",
  choices: [{
    finish_reason: "content_filter",
    message: {
      role: "assistant",
      content: null
    }
  }],
  created: 1709492400,
  model: "anthropic/claude-3-opus-20240229",
  object: "chat.completion",
  usage: {
    prompt_tokens: 20,
    completion_tokens: 12,
    total_tokens: 32
  }
};

export const streamingChunks: OpenRouterStreamingChunk[] = [
  {
    id: "gen-test-stream",
    choices: [{
      finish_reason: null,
      delta: {
        role: "assistant",
        content: "Hello"
      }
    }],
    model: "anthropic/claude-3-opus-20240229",
    object: "chat.completion.chunk"
  },
  {
    id: "gen-test-stream",
    choices: [{
      finish_reason: null,
      delta: {
        content: " there"
      }
    }],
    model: "anthropic/claude-3-opus-20240229",
    object: "chat.completion.chunk"
  },
  {
    id: "gen-test-stream",
    choices: [{
      finish_reason: null,
      delta: {
        content: "!"
      }
    }],
    model: "anthropic/claude-3-opus-20240229",
    object: "chat.completion.chunk"
  },
  {
    id: "gen-test-stream",
    choices: [{
      finish_reason: "stop",
      delta: {}
    }],
    model: "anthropic/claude-3-opus-20240229",
    object: "chat.completion.chunk"
  }
];
