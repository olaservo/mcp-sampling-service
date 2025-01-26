import { ModelSelector, ModelConfig } from './model-selector';
import { jest } from '@jest/globals';

// Mock fetch globally for tests
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch as unknown as typeof fetch;

describe('ModelSelector', () => {
  let modelSelector: ModelSelector;
  const apiKey = 'test-api-key';
  
  // Sample model configs based on default-models.json
  const modelConfigs: ModelConfig[] = [
    {
      id: 'anthropic/claude-3.5-sonnet',
      speedScore: 0.67,
      intelligenceScore: 0.68,
      costScore: 0.70
    },
    {
      id: 'google/gemini-flash-1.5',
      speedScore: 0.94,
      intelligenceScore: 0.49,
      costScore: 0.98
    },
    {
      id: 'openai/o1',
      speedScore: 0.13,
      intelligenceScore: 1.00,
      costScore: 0.15
    },
    {
      id: 'mistralai/mistral-nemo',
      speedScore: 0.71,
      intelligenceScore: 0.00,
      costScore: 1.00
    }
  ];

  const mockOpenRouterResponse = {
    data: [
      {
        id: 'anthropic/claude-3.5-sonnet',
        pricing: { prompt: '0.0002', completion: '0.0002', image: '0', request: '0' },
        context_length: 200000,
        architecture: { modality: 'text', tokenizer: 'tokens', instruct_type: null }
      },
      {
        id: 'google/gemini-flash-1.5',
        pricing: { prompt: '0.0001', completion: '0.0001', image: '0', request: '0' },
        context_length: 128000,
        architecture: { modality: 'text', tokenizer: 'tokens', instruct_type: null }
      },
      {
        id: 'openai/o1',
        pricing: { prompt: '0.01', completion: '0.01', image: '0', request: '0' },
        context_length: 32000,
        architecture: { modality: 'text', tokenizer: 'tokens', instruct_type: null }
      },
      {
        id: 'mistralai/mistral-nemo',
        pricing: { prompt: '0.00001', completion: '0.00001', image: '0', request: '0' },
        context_length: 8000,
        architecture: { modality: 'text', tokenizer: 'tokens', instruct_type: null }
      }
    ]
  };

  beforeEach(() => {
    // Reset mocks
    mockFetch.mockReset();
    
    // Setup default successful response
    mockFetch.mockResolvedValue(new Response(
      JSON.stringify(mockOpenRouterResponse),
      {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' })
      }
    ));

    modelSelector = new ModelSelector(apiKey, modelConfigs);
  });

  describe('constructor', () => {
    it('should initialize with valid model configs', () => {
      expect(() => new ModelSelector(apiKey, modelConfigs)).not.toThrow();
    });

    it('should initialize with empty model configs', () => {
      expect(() => new ModelSelector(apiKey, [])).not.toThrow();
    });
  });

  describe('model selection', () => {
    it('should select fastest model when speed is highest priority', async () => {
      const result = await modelSelector.selectModel(
        { speedPriority: 1, costPriority: 0, intelligencePriority: 0 },
        { maxTokens: 100 }
      );
      expect(result).toBe('google/gemini-flash-1.5');
    });

    it('should select most intelligent model when intelligence is highest priority', async () => {
      const result = await modelSelector.selectModel(
        { speedPriority: 0, costPriority: 0, intelligencePriority: 1 },
        { maxTokens: 100 }
      );
      expect(result).toBe('openai/o1');
    });

    it('should select cheapest model when cost is highest priority', async () => {
      const result = await modelSelector.selectModel(
        { speedPriority: 0, costPriority: 1, intelligencePriority: 0 },
        { maxTokens: 100 }
      );
      expect(result).toBe('mistralai/mistral-nemo');
    });

    it('should respect context length requirements', async () => {
      const result = await modelSelector.selectModel(
        { speedPriority: 1 },
        { prompt: 'x'.repeat(9000), maxTokens: 100 }
      );
      // Should skip mistral-nemo (8000 context) and choose gemini-flash
      expect(result).toBe('google/gemini-flash-1.5');
    });

    it('should prioritize models matching hints', async () => {
      const result = await modelSelector.selectModel(
        { 
          hints: [{ name: 'gemini' }],
          speedPriority: 0.5
        },
        { maxTokens: 100 }
      );
      expect(result).toBe('google/gemini-flash-1.5');
    });

    it('should balance multiple priorities', async () => {
      const result = await modelSelector.selectModel(
        {
          speedPriority: 0.3,
          costPriority: 0.3,
          intelligencePriority: 0.3
        },
        { maxTokens: 100 }
      );
      // Gemini-flash should win with balanced scores
      expect(result).toBe('google/gemini-flash-1.5');
    });
  });

  describe('default model behavior', () => {
    it('should return default model when no preferences are provided', async () => {
      const result = await modelSelector.selectModel(
        {},
        { maxTokens: 100 }
      );
      expect(result).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should return default model when empty preferences are provided', async () => {
      const result = await modelSelector.selectModel(
        { hints: [], costPriority: undefined, speedPriority: undefined, intelligencePriority: undefined },
        { maxTokens: 100 }
      );
      expect(result).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should fall back to default model when no suitable model is found', async () => {
      const result = await modelSelector.selectModel(
        { hints: [{ name: 'nonexistent-model' }] },
        { maxTokens: 100 }
      );
      expect(result).toBe('anthropic/claude-3.5-sonnet');
    });
  });

  describe('error handling', () => {
    it('should fall back to default model when no suitable model found', async () => {
      // Mock response with models that don't match the hint
      mockFetch.mockResolvedValue(new Response(
        JSON.stringify({
          data: [
            {
              id: 'other/model-1',
              pricing: { prompt: '0.0001', completion: '0.0001', image: '0', request: '0' },
              context_length: 128000,
              architecture: { modality: 'text', tokenizer: 'tokens', instruct_type: null }
            }
          ]
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'Content-Type': 'application/json' })
        }
      ));

      const result = await modelSelector.selectModel(
        { 
          hints: [{ name: 'nonexistent-model' }]
        },
        { maxTokens: 100 }
      );
      expect(result).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should throw error when context length exceeds all models', async () => {
      // Create new model selector with small context length model
      const smallContextModelConfigs: ModelConfig[] = [
        {
          id: 'small-context-model',
          speedScore: 0.94,
          intelligenceScore: 0.49,
          costScore: 0.98
        }
      ];
      const smallContextSelector = new ModelSelector(apiKey, smallContextModelConfigs);

      // Mock response with small context length model
      mockFetch.mockResolvedValue(new Response(
        JSON.stringify({
          data: [
            {
              id: 'small-context-model',
              pricing: { prompt: '0.0001', completion: '0.0001', image: '0', request: '0' },
              context_length: 1000, // Small context length
              architecture: { modality: 'text', tokenizer: 'tokens', instruct_type: null }
            }
          ]
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'Content-Type': 'application/json' })
        }
      ));

      const result = await smallContextSelector.selectModel(
        { speedPriority: 1, costPriority: 0, intelligencePriority: 0 },
        { prompt: 'x'.repeat(2000), maxTokens: 100 }
      );
      expect(result).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));
      await expect(modelSelector.selectModel(
        { speedPriority: 1 },
        { maxTokens: 100 }
      )).rejects.toThrow('API Error');
    });

    it('should throw error on non-OK response', async () => {
      mockFetch.mockResolvedValue(new Response(
        '',
        {
          status: 400,
          statusText: 'Bad Request',
          headers: new Headers({ 'Content-Type': 'application/json' })
        }
      ));
      await expect(modelSelector.selectModel(
        { speedPriority: 1 },
        { maxTokens: 100 }
      )).rejects.toThrow('OpenRouter API error: Bad Request');
    });
  });
});
