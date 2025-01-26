import { CreateMessageRequest, CreateMessageResult } from "@modelcontextprotocol/sdk/types";
import { SamplingStrategyFactory } from '../types/sampling.js';

export const stubStrategy: SamplingStrategyFactory = () => ({
  handleSamplingRequest: async (_request: CreateMessageRequest): Promise<CreateMessageResult> => ({
    model: "stub-model",
    stopReason: "endTurn",
    role: "assistant",
    content: {
      type: "text",
      text: "This is a stub response."
    }
  })
});
