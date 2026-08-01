import type { Cache } from '../types/cache.js';

export interface Logger {
  debug(message: string, context?: Readonly<Record<string, unknown>>): void;
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}

export interface RateLimitOptions {
  readonly maxRequests: number;
  readonly intervalMs: number;
}

export interface DataJudClientOptions {
  readonly apiKey: string;
  readonly timeout?: number;
  readonly retries?: number;
  readonly retryDelay?: number;
  readonly baseUrl?: string;
  readonly logger?: Logger;
  /**
   * Limite local de requisições. O padrão respeita o limite público de 120 rpm.
   * Use `false` somente quando o controle for realizado externamente.
   */
  readonly rateLimit?: RateLimitOptions | false;
  readonly cache?: Cache;
  /** Injeção destinada a testes e runtimes sem `fetch` global. */
  readonly fetch?: typeof globalThis.fetch;
}
