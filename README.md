# mcp-sampling-service

🚧 **UNDER CONSTRUCTION: This package is currently being developed and its API may change.** 🚧

A proof of concept for a flexible sampling strategy registry to use with the Model Context Protocol (MCP).

## Installation

```bash
npm install mcp-sampling-service
```

## Features

- Plugin-based sampling strategy system
- OpenRouter integration with smart model selection
- Model scoring based on speed, intelligence, and cost
- Configurable model preferences and hints
- Default models support
- Type-safe implementation
- Extensible architecture

## Configuration

The sampling service uses a configuration-based approach for initialization. This provides better flexibility, runtime updates, and easier testing compared to environment variables.

### Configuration Options

- **apiKey** (required): Your OpenRouter API key
- **defaultModel** (required): Model to use when no preferences match
- **allowedModels** (optional): JSON string of custom model configurations. If not provided, uses built-in model configurations optimized for various use cases.

### Model Selection

The service selects models based on:

1. Matching hints in order
2. Priority scoring (speed, intelligence, cost)
3. Fallback to defaultModel

### OpenRouter Configuration

```typescript
const service = new SamplingService({
  openRouter: {
    apiKey: "your-api-key-here",
    defaultModel: "anthropic/claude-3.5-sonnet",
    allowedModels: [
      {
        id: "openai/gpt-4",
        speedScore: 0.7,
        intelligenceScore: 0.9,
        costScore: 0.3
      },
      {
        id: "anthropic/claude-3.5-sonnet",
        speedScore: 0.9,
        intelligenceScore: 0.7,
        costScore: 0.8
      }
    ]
  }
});
```

### Custom Strategy Configuration

```typescript
const service = new SamplingService({
  strategy: customStrategy({
    // Your custom strategy configuration
  })
});
```

## Usage

### Basic Usage

```typescript
import { 
  SamplingStrategyRegistry, 
  stubStrategy, 
  openRouterStrategy 
} from 'mcp-sampling-service';

// Get registry instance
const registry = SamplingStrategyRegistry.getInstance();

// Register built-in strategies
registry.register('stub', stubStrategy);
registry.register('openrouter', openRouterStrategy);

// Create strategy instance with configuration
const strategy = registry.create('openrouter', {
  apiKey: "your-api-key-here",
  defaultModel: "anthropic/claude-3.5-sonnet",
  allowedModels:[
    {
      id: "openai/gpt-4",
      speedScore: 0.7,
      intelligenceScore: 0.9,
      costScore: 0.3
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      speedScore: 0.9,
      intelligenceScore: 0.7,
      costScore: 0.8
    }
  ]
});

// Use strategy with model preferences
const result = await strategy.handleSamplingRequest({
  params: {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Hello!'
        }
      }
    ],
    maxTokens: 1000,
    modelPreferences: {
      speedPriority: 0.8,
      intelligencePriority: 0.6,
      costPriority: 0.4,
      hints: [
        { name: "gpt" }
      ]
    }
  }
});
```

### Custom Strategy

```typescript
import { 
  SamplingStrategy, 
  SamplingStrategyFactory 
} from 'mcp-sampling-service';

// Create your strategy factory
const customStrategy: SamplingStrategyFactory = (config) => ({
  handleSamplingRequest: async (request) => {
    // Your implementation here
    return {
      model: "custom-model",
      stopReason: "endTurn",
      role: "assistant",
      content: {
        type: "text",
        text: "Custom response"
      }
    };
  }
});

// Register your strategy
registry.register('custom', customStrategy);
```

### Using SamplingService Directly

```typescript
import { SamplingService } from 'mcp-sampling-service';

const service = new SamplingService({
  openRouter: {
    apiKey: "your-api-key-here",
    defaultModel: "anthropic/claude-3.5-sonnet"
    // allowedModels is optional - will use built-in model configurations if not provided
  }
});

const result = await service.handleSamplingRequest({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Hello!'
      }
    }
  ],
  maxTokens: 1000,
  modelPreferences: {
    costPriority: 0.9,
    hints: [{ name: "gpt-4" }]
  }
}, requestId);
```

## API Reference

### SamplingStrategyRegistry

- `getInstance()`: Get singleton instance
- `register(name: string, factory: SamplingStrategyFactory)`: Register a strategy
- `create(name: string, config: any)`: Create strategy instance
- `getAvailableStrategies()`: Get list of registered strategies

### Built-in Strategies

#### Stub Strategy
Simple strategy that returns a fixed response. Useful for testing.

#### OpenRouter Strategy
Strategy that connects to OpenRouter's API with intelligent model selection.

Configuration:
```typescript
interface OpenRouterStrategyConfig {
  apiKey: string;
  defaultModel: string;
  allowedModels?: string;  // JSON string of ModelConfig[] - uses built-in configurations if not provided
}

interface ModelConfig {
  id: string;
  speedScore: number;    // 0-1 score for model speed
  intelligenceScore: number;  // 0-1 score for model capability
  costScore: number;     // 0-1 score for cost efficiency
}
```

Model Preferences:
```typescript
interface ModelPreferences {
  model?: string;  // Specific model override
  hints?: ModelHint[];  // Hints for model selection
  costPriority?: number;  // Priority for cost efficiency
  speedPriority?: number;  // Priority for response speed
  intelligencePriority?: number;  // Priority for model capability
}

interface ModelHint {
  name?: string;  // Partial model name to match
  [key: string]: unknown;
}
```
