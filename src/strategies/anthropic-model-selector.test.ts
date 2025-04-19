import { AnthropicModelSelector, AnthropicModelConfig } from './anthropic-model-selector.js';
import '@jest/globals';

describe('AnthropicModelSelector', () => {
  const modelConfigs: AnthropicModelConfig[] = [
    {
      id: "claude-3-7-sonnet-latest",
      speedScore: 0.8,
      intelligenceScore: 1.0,
      costScore: 0.7,
      contextWindow: 200000,
      supportsExtendedThinking: true
    },
    {
      id: "claude-3-5-haiku-latest",
      speedScore: 1.0,
      intelligenceScore: 0.7,
      costScore: 0.9,
      contextWindow: 200000,
      supportsExtendedThinking: false
    },
    {
      id: "claude-3-5-sonnet-latest",
      speedScore: 0.8,
      intelligenceScore: 0.9,
      costScore: 0.7,
      contextWindow: 200000,
      supportsExtendedThinking: false
    }
  ];

  const defaultModel = "claude-3-5-sonnet-latest";
  let selector: AnthropicModelSelector;

  beforeEach(() => {
    selector = new AnthropicModelSelector(modelConfigs, defaultModel);
  });

  it('should return default model when no preferences provided', () => {
    const selectedModel = selector.selectModel({}, {});
    expect(selectedModel).toBe(defaultModel);
  });

  it('should select claude-3-7-sonnet when prioritizing intelligence', () => {
    const prefs = {
      intelligencePriority: 1,
      costPriority: 0,
      speedPriority: 0
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-7-sonnet-latest');
  });

  it('should select claude-3-5-haiku when prioritizing speed', () => {
    const prefs = {
      speedPriority: 1,
      costPriority: 0,
      intelligencePriority: 0
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-5-haiku-latest');
  });

  it('should select claude-3-5-haiku when prioritizing cost', () => {
    const prefs = {
      costPriority: 1,
      speedPriority: 0,
      intelligencePriority: 0
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-5-haiku-latest');
  });

  it('should respect context length requirements', () => {
    const prefs = {
      intelligencePriority: 1
    };
    
    // Request more tokens than any model supports
    const params = {
      prompt: 'x'.repeat(200001),
      maxTokens: 1000
    };

    const selectedModel = selector.selectModel(prefs, params);
    expect(selectedModel).toBe(defaultModel);
  });

  it('should select model matching first hint', () => {
    const prefs = {
      intelligencePriority: 1,
      hints: [{ name: 'haiku' }, { name: 'sonnet' }]
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-5-haiku-latest');
  });

  it('should fallback to second hint if first hint has no matches', () => {
    const prefs = {
      intelligencePriority: 1,
      hints: [{ name: 'nonexistent' }, { name: 'sonnet' }]
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-7-sonnet-latest'); // Most intelligent sonnet model
  });

  it('should select claude-3-7-sonnet when extended thinking is required', () => {
    const prefs = {
      extendedThinkingRequired: true
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-7-sonnet-latest');
  });

  it('should handle multiple priorities', () => {
    const prefs = {
      intelligencePriority: 0.9,
      costPriority: 0.1,
      hints: [{ name: 'sonnet' }]
    };

    const selectedModel = selector.selectModel(prefs, {});
    // claude-3-7-sonnet has highest intelligence among sonnets
    expect(selectedModel).toBe('claude-3-7-sonnet-latest');
  });

  it('should use specific model if provided and valid', () => {
    const prefs = {
      model: 'claude-3-5-haiku-latest',
      intelligencePriority: 1 // This should be ignored
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-5-haiku-latest');
  });

  it('should ignore invalid specific model and use preferences', () => {
    const prefs = {
      model: 'nonexistent-model',
      speedPriority: 1
    };

    const selectedModel = selector.selectModel(prefs, {});
    expect(selectedModel).toBe('claude-3-5-haiku-latest'); // Fastest model
  });
});
