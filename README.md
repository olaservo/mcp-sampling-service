# zem-sampling-service

A flexible sampling service and strategy registry for the zem ecosystem.

## Installation

```bash
npm install zem-sampling-service
```

## Features

- Plugin-based sampling strategy system
- Built-in strategies (stub and zem)
- Type-safe implementation
- Extensible architecture

## Usage

### Basic Usage

```typescript
import { 
  SamplingStrategyRegistry, 
  stubStrategy, 
  zemStrategy 
} from 'zem-sampling-service';

// Get registry instance
const registry = SamplingStrategyRegistry.getInstance();

// Register built-in strategies
registry.register('stub', stubStrategy);
registry.register('zem', zemStrategy);

// Create strategy instance
const strategy = registry.create('zem', { 
  apiEndpoint: 'http://localhost:3001' 
});

// Use strategy
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
    maxTokens: 1000
  }
});
```

### Custom Strategy

```typescript
import { 
  SamplingStrategy, 
  SamplingStrategyFactory 
} from 'zem-sampling-service';

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
import { SamplingService } from 'zem-sampling-service';

const service = new SamplingService();

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
  maxTokens: 1000
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

#### Zem Strategy
Strategy that connects to zem-ui's completion API.

Configuration:
```typescript
interface ZemSamplingConfig {
  apiEndpoint: string;
}
```

### SamplingService

Core service that handles sampling requests with proper validation and error handling.

## License

MIT
