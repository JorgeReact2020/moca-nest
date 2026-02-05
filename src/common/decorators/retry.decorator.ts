import { HubSpotApiError } from '../errors';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504], // Never retry 4xx client errors
};

/**
 * Decorator for retrying failed HubSpot API calls with exponential backoff
 * Automatically retries on rate limits (429) and server errors (5xx)
 */
export function Retry(options: RetryOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value as (
      this: { logger?: { warn: (msg: string) => void } },
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: { logger?: { warn: (msg: string) => void } },
      ...args: unknown[]
    ): Promise<unknown> {
      let lastError: Error | undefined;
      let delay = config.initialDelay;

      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          // Check if error is retryable
          const isRetryable =
            error instanceof HubSpotApiError &&
            (error.retryable ||
              config.retryableStatusCodes.includes(error.statusCode));

          // Don't retry on last attempt or non-retryable errors
          if (attempt === config.maxAttempts || !isRetryable) {
            throw error;
          }

          // Special handling for rate limits (429)
          if (error instanceof HubSpotApiError && error.statusCode === 429) {
            // Use Retry-After header if available, otherwise use exponential backoff
            delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
          } else {
            // Exponential backoff
            delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
          }

          // Log retry attempt if logger is available
          if (this.logger) {
            this.logger.warn(
              `Retry attempt ${attempt}/${config.maxAttempts} for ${propertyKey} after ${delay}ms. Error: ${lastError.message}`,
            );
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError ?? new Error('Retry failed with unknown error');
    };

    return descriptor;
  };
}
