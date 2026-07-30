import type { Cache } from '../types/cache.js';
export interface Logger {
  debug(message: string, context?: Readonly<Record<string, unknown>>): void;
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}
export interface RateLimitOptions { readonly maxRequests: number; readonly intervalMs: number }
export interface ResponseContext { readonly response: Response; readonly attempt: number; readonly durationMs: number }
export type ResponseInterceptor = (context: ResponseContext) => void | Promise<void>;
export interface DataJudClientOptions {
  readonly apiKey: string;
  readonly timeout?: number;
  readonly retries?: number;
  readonly retryDelay?: number;
  readonly baseUrl?: string;
  readonly logger?: Logger;
  readonly rateLimit?: RateLimitOptions;
  readonly cache?: Cache;
  readonly responseInterceptors?: readonly ResponseInterceptor[];
  readonly fetch?: typeof globalThis.fetch;
}
