import { CreateMessageRequest, CreateMessageResult } from "@modelcontextprotocol/sdk/types";
import { openRouterStrategy } from "../../openrouter";
import { createOpenRouterMock } from "./mocks/openrouter-api.mock";
import { streamingChunks } from "./fixtures/responses";
describe("OpenRouter Strategy", () => {
  const mockApiKey = "mock-api-key";
  const defaultModel = "anthropic/claude-3-opus-20240229";
  let mockApi: ReturnType<typeof createOpenRouterMock>;

  beforeEach(() => {
    mockApi = createOpenRouterMock();
    global.fetch = mockApi.fetch as unknown as typeof global.fetch;
  });

  describe("Basic Message Creation", () => {
    it("creates a basic message successfully", async () => {
      const strategy = openRouterStrategy({
        apiKey: mockApiKey,
        defaultModel
      });

      const request: CreateMessageRequest = {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Hello!"
              }
            }
          ],
          maxTokens: 100,
          temperature: 0.2,
          systemPrompt: "You are a helpful assistant."
        }
      };

      const result = await strategy.handleSamplingRequest(request);

      expect(result.model).toBe(defaultModel);
      expect(result.stopReason).toBe("stop");
      expect(result.role).toBe("assistant");
      expect(result.content?.type).toBe("text");
      expect(result.content?.text).toBe("Hello there!");

      // Verify API call
      expect(mockApi.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockApi.fetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mockApiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MCP Sampling Service"
      });

      const requestBody = JSON.parse(options.body as string);
      expect(requestBody).toMatchObject({
        model: defaultModel,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant."
          },
          {
            role: "user",
            content: "Hello!"
          }
        ],
        max_tokens: 100,
        temperature: 0.2
      });
    });

    it("handles streaming messages correctly", async () => {
      const strategy = openRouterStrategy({
        apiKey: mockApiKey,
        defaultModel
      });

      mockApi = createOpenRouterMock({
        streaming: true,
        response: streamingChunks
      });
      global.fetch = mockApi.fetch as unknown as typeof global.fetch;

      const request: CreateMessageRequest = {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Count from 1 to 5."
              }
            }
          ],
          maxTokens: 100,
          temperature: 0.2,
          systemPrompt: "You are a helpful assistant."
        }
      };

      const chunks: Partial<CreateMessageResult>[] = [];
      const onChunk = (chunk: Partial<CreateMessageResult>) => {
        chunks.push(chunk);
      };

      if (strategy && strategy.handleStreamingSamplingRequest) {
        await strategy.handleStreamingSamplingRequest(request, onChunk);
      }      

      // Verify chunks were received in correct order
      expect(chunks.length).toBeGreaterThan(0);
      
      // First chunk should have role
      const firstChunk = chunks[0];
      expect(firstChunk).toMatchObject({
        role: "assistant",
        content: {
          type: "text",
          text: "Hello"
        }
      });

      // Middle chunks should add content
      const middleChunk = chunks[1];
      expect(middleChunk?.content?.text).toBe(" there");

      // Third chunk should have the exclamation mark
      const thirdChunk = chunks[2];
      expect(thirdChunk?.content?.text).toBe("!");

      // Last chunk should have stop reason
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.stopReason).toBe("stop");

      // Verify streaming API call
      expect(mockApi.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockApi.fetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
      
      const requestBody = JSON.parse(options.body as string);
      expect(requestBody.stream).toBe(true);
    });

    it("handles errors appropriately", async () => {
      mockApi = createOpenRouterMock({
        error: new Error("API Error")
      });
      global.fetch = mockApi.fetch as unknown as typeof global.fetch;

      const strategy = openRouterStrategy({
        apiKey: mockApiKey,
        defaultModel
      });

      const request: CreateMessageRequest = {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Hello!"
              }
            }
          ],
          maxTokens: 100
        }
      };

      await expect(strategy.handleSamplingRequest(request))
        .rejects
        .toThrow("API Error");
    });

  });
});
