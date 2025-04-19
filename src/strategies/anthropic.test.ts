import { anthropicStrategy, ANTHROPIC_CONFIG_DEFINITION } from './anthropic.js';
import { CreateMessageRequest } from '@modelcontextprotocol/sdk/types';

// Mock Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate }
  }))
}));

describe('Anthropic Strategy', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  const validConfig = {
    apiKey: 'test-api-key',
    model: 'claude-3-5-sonnet-latest'
  };

  it('should validate config correctly', () => {
    expect(() => anthropicStrategy(validConfig)).not.toThrow();
    expect(() => anthropicStrategy({})).toThrow('Invalid Anthropic configuration');
    expect(() => anthropicStrategy({ apiKey: 'key' })).toThrow('Invalid Anthropic configuration');
    expect(() => anthropicStrategy({ model: 'model' })).toThrow('Invalid Anthropic configuration');
  });

  it('should have correct strategy definition', () => {
    expect(ANTHROPIC_CONFIG_DEFINITION).toEqual({
      id: 'anthropic',
      name: 'Anthropic',
      requiresConfig: true,
      configFields: [
        {
          name: 'model',
          type: 'string',
          label: 'Model',
          placeholder: 'claude-3-5-sonnet-latest',
          required: true
        }
      ]
    });
  });

  it('should handle system prompts correctly', async () => {
    mockCreate.mockResolvedValue({
      model: 'claude-3-5-sonnet-latest',
      content: [{ type: 'text', text: 'Hi there!' }],
      stop_reason: 'end_turn'
    });

    const strategy = anthropicStrategy(validConfig);
    const request: CreateMessageRequest = {
      method: 'sampling/createMessage',
      params: {
        systemPrompt: 'You are a helpful assistant',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Hello'
            }
          }
        ],
        maxTokens: 1024,
        temperature: 0.7,
        stopSequences: [],
        tools: [],
        toolChoice: null,
        modelPreferences: {
          model: 'claude-3-5-sonnet-latest'
        }
      }
    };

    const result = await strategy.handleSamplingRequest(request);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: [
        { role: 'user', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' }
      ]
    }));

    expect(result).toEqual({
      model: 'claude-3-5-sonnet-latest',
      stopReason: 'end_turn',
      role: 'assistant',
      content: {
        type: 'text',
        text: 'Hi there!'
      }
    });
  });
});
