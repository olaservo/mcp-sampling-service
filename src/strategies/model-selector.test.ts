import { ModelSelector } from './model-selector.js';
import { env } from '../config/env.js';

describe('ModelSelector', () => {
  const modelConfigs = [
    {
      "id": "openai/gpt-4o",
      "speedScore": 0.67,
      "intelligenceScore": 0.46,
      "costScore": 0.75
    },
    {
      "id": "openai/gpt-4o-mini",
      "speedScore": 0.68,
      "intelligenceScore": 0.46,
      "costScore": 0.97
    },
    {
      "id": "openai/o1",
      "speedScore": 0.13,
      "intelligenceScore": 1.00,
      "costScore": 0.15
    },
    {
      "id": "openai/o1-mini",
      "speedScore": 0.90,
      "intelligenceScore": 0.80,
      "costScore": 0.72
    },
    {
      "id": "anthropic/claude-3.5-sonnet",
      "speedScore": 0.50,
      "intelligenceScore": 0.90,
      "costScore": 0.60
    }
  ];

  let selector: ModelSelector;

  beforeEach(() => {
    selector = new ModelSelector('dummy-key', modelConfigs);
  });

  it('should return default model when no preferences provided', async () => {
    const selectedModel = await selector.selectModel({}, {});
    expect(selectedModel).toBe(env.DEFAULT_MODEL_NAME);
  });

  it('should select openai/o1 when prioritizing intelligence', async () => {
    const prefs = {
      costPriority: 0,
      hints: [{ name: 'openai' }],
      intelligencePriority: 1
    };

    const selectedModel = await selector.selectModel(prefs, {});
    expect(selectedModel).toBe('openai/o1');
  });

  it('should select gpt-4o-mini when prioritizing cost among gpt models', async () => {
    const prefs = {
      costPriority: 1,
      hints: [{ name: 'gpt' }],
      intelligencePriority: 0
    };

    const selectedModel = await selector.selectModel(prefs, {});
    expect(selectedModel).toBe('openai/gpt-4o-mini');
  });

  it('should select o1-mini when prioritizing speed', async () => {
    const prefs = {
      speedPriority: 1,
      hints: [{ name: 'openai' }],
      costPriority: 0,
      intelligencePriority: 0
    };

    const selectedModel = await selector.selectModel(prefs, {});
    expect(selectedModel).toBe('openai/o1-mini');
  });

  it('should respect context length requirements', async () => {
    const prefs = {
      intelligencePriority: 1
    };
    
    // Request more tokens than any model supports
    const params = {
      prompt: 'x'.repeat(1000000),
      maxTokens: 1000000
    };

    const selectedModel = await selector.selectModel(prefs, params);
    expect(selectedModel).toBe(env.DEFAULT_MODEL_NAME);
  });

  it('should filter by hints before scoring', async () => {
    const prefs = {
      intelligencePriority: 1,
      hints: [{ name: 'claude' }]
    };

    const selectedModel = await selector.selectModel(prefs, {});
    expect(selectedModel).toBe('anthropic/claude-3.5-sonnet');
  });

  it('should handle multiple priorities', async () => {
    const prefs = {
      intelligencePriority: 0.9,
      costPriority: 0.1,
      hints: [{ name: 'openai' }]
    };

    const selectedModel = await selector.selectModel(prefs, {});
    // o1 has highest intelligence but poor cost score
    // This should still win due to intelligence being weighted higher
    expect(selectedModel).toBe('openai/o1');
  });
});
