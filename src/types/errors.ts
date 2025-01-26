export const SamplingErrorCodes = {
  SamplingError: -32008,
  SamplingExecutionError: -32009,
} as const;

export class SamplingError extends Error {
  constructor(
    public readonly code: number,
    message: string
  ) {
    super(message);
    this.name = 'SamplingError';
  }
}
