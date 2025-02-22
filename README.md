# mcp-sampling-service

🚧 **UNDER CONSTRUCTION: This package is currently being developed and its API may change. Not recommended to be used directly in any production apps!** 🚧

A proof of concept for a flexible sampling strategy registry to use with the [Model Context Protocol](https://modelcontextprotocol.io/introduction) (a.k.a. MCP).

## Installation

```bash
npm install mcp-sampling-service
```

## Features

- Plugin-based sampling strategy system
- Includes example OpenRouter integration with intelligent model selection
- Extensible architecture

## Initialization

The library uses a registry-based approach for managing [sampling](https://modelcontextprotocol.io/docs/concepts/sampling) strategies. The recommended way to initialize the service is through the `initializeSamplingService` function:

```typescript
import { initializeSamplingService } from 'mcp-sampling-service';

// Initialize with default strategies (stub and openrouter)
const registry = initializeSamplingService({
  useDefaultStrategies: true
});

// Or initialize with custom strategies
const registry = initializeSamplingService({
  useDefaultStrategies: false,
  additionalStrategies: {
    myStrategy: {
      factory: myStrategyFactory,
      definition: myStrategyDefinition
    }
  }
});
```

## Configuration

### OpenRouter Strategy Configuration

The OpenRouter strategy requires configuration for API access and model selection:

```typescript
const strategy = registry.create('openrouter', {
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
});
```

### Model Selection Process

The OpenRouter strategy selects models based on:

1. Model hints (processed in order)
3. Priority scoring:
   - Speed priority (response time)
   - Intelligence priority (model capabilities)
   - Cost priority (token pricing)
4. Fallback to default model if no suitable match

## Usage

### Basic Usage

```typescript
import { 
  initializeSamplingService,
  SamplingStrategy 
} from 'mcp-sampling-service';

// Initialize registry
const registry = initializeSamplingService();

// Create strategy instance
const strategy = registry.create('openrouter', {
  apiKey: "your-api-key-here",
  defaultModel: "anthropic/claude-3.5-sonnet"
});

// Use strategy
const result = await strategy.handleSamplingRequest({
  method: "sampling/createMessage",
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
    temperature: 0.2, // Optional, defaults to 0.2
    systemPrompt: "You are a helpful assistant", // Optional
    stopSequences: ["END"], // Optional
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

### Custom Strategy Implementation

```typescript
import { 
  SamplingStrategy,
  SamplingStrategyDefinition,
  CreateMessageRequest,
  CreateMessageResult
} from 'mcp-sampling-service';

// Define your strategy's configuration requirements
const myStrategyDefinition: SamplingStrategyDefinition = {
  id: 'custom',
  name: 'Custom Strategy',
  requiresConfig: true,
  configFields: [
    {
      name: 'apiKey',
      type: 'string',
      label: 'API Key',
      required: true
    }
  ]
};

// Create your strategy factory
const myStrategyFactory = (config: Record<string, unknown>): SamplingStrategy => ({
  handleSamplingRequest: async (request: CreateMessageRequest): Promise<CreateMessageResult> => {
    // Your implementation here
    return {
      model: "custom-model",
      stopReason: "stop",
      role: "assistant",
      content: {
        type: "text",
        text: "Custom response"
      }
    };
  }
});

// Register your strategy
const registry = initializeSamplingService({
  useDefaultStrategies: true,
  additionalStrategies: {
    custom: {
      factory: myStrategyFactory,
      definition: myStrategyDefinition
    }
  }
});
```

## API Reference

### SamplingStrategyRegistry

Static class that manages sampling strategies:

- `getInstance()`: Get singleton instance
- `register(name: string, factory: SamplingStrategyFactory, definition: SamplingStrategyDefinition)`: Register a strategy
- `create(name: string, config: Record<string, unknown>)`: Create strategy instance
- `getAvailableStrategies()`: Get list of registered strategies

### Request Parameters

```typescript
interface SamplingParams {
  messages: SamplingMessage[];
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  modelPreferences?: ModelPreferences;
}

interface ModelPreferences {
  hints?: Array<{ name?: string }>;
  costPriority?: number;
  speedPriority?: number;
  intelligencePriority?: number;
}
```

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
  allowedModels?: ModelConfig[];
}

interface ModelConfig {
  id: string;
  speedScore: number;    // 0-1 score for model speed
  intelligenceScore: number;  // 0-1 score for model capability
  costScore: number;     // 0-1 score for cost efficiency
}
```

### Error Handling

The service provides structured error handling:

```typescript
interface SamplingResponse {
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
    code: number;  // -32008 for SamplingError, -32009 for SamplingExecutionError
    message: string;
  };
}
