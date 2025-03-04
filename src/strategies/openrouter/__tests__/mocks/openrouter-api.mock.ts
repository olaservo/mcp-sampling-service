import { TextEncoder } from 'util';
import {
  basicCompletionResponse,
  streamingChunks
} from '../fixtures/responses';

interface MockConfig {
  streaming?: boolean;
  error?: Error;
  response?: any;
}

export function createOpenRouterMock(config: MockConfig = {}) {
  resetMock();
  
  if (config.error) {
    mockFetch.mockRejectedValue(config.error);
  } else if (config.streaming) {
    mockFetch.mockImplementation(async (url: string, options: RequestInit): Promise<Response> => {
      const requestBody = JSON.parse(options.body as string);
      return Promise.resolve(new Response(createReadableStream(config.response || streamingChunks), {
        status: 200,
        headers: new Headers({
          'Content-Type': 'text/event-stream'
        })
      }));
    });
  } else if (config.response) {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(config.response), {
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    }));
  }

  return {
    fetch: mockFetch
  };
}

/**
 * Mock fetch implementation for OpenRouter API tests
 */
const mockFetch = jest.fn().mockImplementation(async (url: string, options: RequestInit): Promise<Response> => {
  const requestBody = JSON.parse(options.body as string);
  const headers = options.headers as Record<string, string>;

  // Validate required headers
  if (!headers.Authorization?.startsWith('Bearer ')) {
    return Promise.reject(new Error('Missing or invalid Authorization header'));
  }

  if (!headers['Content-Type']?.includes('application/json')) {
    return Promise.reject(new Error('Missing or invalid Content-Type header'));
  }

  // Handle default response
  return Promise.resolve(new Response(JSON.stringify(basicCompletionResponse), {
    status: 200,
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  }));
});

/**
 * Create a ReadableStream that emits the appropriate chunks based on the request
 */
function createReadableStream(chunks: any[]): ReadableStream {
  const encoder = new TextEncoder();
  let chunkIndex = 0;

  return new ReadableStream({
    start(controller) {
      const pushChunk = () => {
        if (chunkIndex >= chunks.length) {
          controller.close();
          return;
        }

        const chunk = chunks[chunkIndex++];
        const data = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(encoder.encode(data));

        setTimeout(pushChunk, 0);
      };

      pushChunk();
    }
  });
}

/**
 * Reset the mock between tests
 */
export function resetMock() {
  mockFetch.mockClear();
}
