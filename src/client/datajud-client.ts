import { DEFAULT_BASE_URL, RETRYABLE_STATUS_CODES } from '../constants/api.js';
import { DataJudError, TimeoutError, errorFromResponse } from '../errors/index.js';
import { mapSearchResponse } from '../mappers/processo-mapper.js';
import type { Processo } from '../models/processo.js';
import type { DataJudClientOptions } from '../types/client.js';
import type { SearchOptions, SearchRequest, SearchResponse } from '../types/query.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { stableJson } from '../utils/stable-json.js';
import { resolveAlias } from '../utils/tribunal.js';
import { validateSearchRequest } from '../validators/search.js';

const sleep = async (ms: number, signal?: AbortSignal): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new Error('Operação abortada.'));
    }, { once: true });
  });
};

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

export class DataJudClient {
  readonly #options: Required<Pick<DataJudClientOptions, 'timeout' | 'retries' | 'retryDelay' | 'baseUrl'>>;
  readonly #apiKey: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #rateLimiter?: RateLimiter;
  readonly #extra: Pick<DataJudClientOptions, 'logger' | 'cache' | 'responseInterceptors'>;

  constructor(options: DataJudClientOptions) {
    if (!options.apiKey.trim()) throw new DataJudError('apiKey é obrigatória.');
    this.#apiKey = options.apiKey.replace(/^ApiKey\s+/i, '').trim();
    this.#options = {
      timeout: options.timeout ?? 30_000,
      retries: options.retries ?? 3,
      retryDelay: options.retryDelay ?? 250,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    };
    if (this.#options.timeout <= 0 || this.#options.retries < 0 || this.#options.retryDelay < 0) {
      throw new DataJudError('timeout, retries e retryDelay devem ser valores válidos não negativos.');
    }
    this.#fetch = options.fetch ?? globalThis.fetch;
    if (options.rateLimit) {
      if (options.rateLimit.maxRequests <= 0 || options.rateLimit.intervalMs <= 0) throw new DataJudError('Rate limiter inválido.');
      this.#rateLimiter = new RateLimiter(options.rateLimit);
    }
    this.#extra = {
      ...(options.logger ? { logger: options.logger } : {}),
      ...(options.cache ? { cache: options.cache } : {}),
      ...(options.responseInterceptors ? { responseInterceptors: options.responseInterceptors } : {}),
    };
  }

  async search<T = Processo>(alias: string, options: SearchOptions = {}): Promise<SearchResponse<T>> {
    const { source, signal, cacheTtlMs, ...bodyOptions } = options;
    const body: SearchRequest = { ...bodyOptions, ...(source === undefined ? {} : { _source: source }) };
    validateSearchRequest(body);
    const url = resolveAlias(alias, this.#options.baseUrl);
    const cacheKey = `${url}:${stableJson(body)}`;
    if (cacheTtlMs !== undefined) {
      const cached = await this.#extra.cache?.get<SearchResponse<T>>(cacheKey);
      if (cached !== undefined) return cached;
    }
    const value = await this.#request(url, body, signal);
    const response = mapSearchResponse<T>(value);
    if (cacheTtlMs !== undefined) await this.#extra.cache?.set(cacheKey, response, cacheTtlMs);
    return response;
  }

  async *iterate<T = Processo>(
    alias: string,
    options: SearchOptions & { readonly pageSize?: number } = {},
  ): AsyncGenerator<T, void, undefined> {
    const { pageSize = options.size ?? 100, ...base } = options;
    let searchAfter = options.search_after;
    const sort = options.sort ?? [{ '@timestamp': { order: 'asc' } }, { id: { order: 'asc' } }];
    do {
      const page = await this.search<T>(alias, { ...base, size: pageSize, sort, ...(searchAfter ? { search_after: searchAfter } : {}) });
      for (const hit of page.hits.hits) yield hit._source;
      if (page.hits.hits.length < pageSize) return;
      searchAfter = page.hits.hits.at(-1)?.sort;
      if (!searchAfter) throw new DataJudError('A resposta não incluiu sort; não é possível continuar search_after.');
    } while (true);
  }

  async #request(url: string, body: SearchRequest, callerSignal?: AbortSignal): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.#options.retries; attempt += 1) {
      callerSignal?.throwIfAborted();
      await this.#rateLimiter?.acquire(callerSignal);
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(), this.#options.timeout);
      const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutController.signal]) : timeoutController.signal;
      const startedAt = Date.now();
      try {
        this.#extra.logger?.debug('DataJud request', { url, attempt });
        const response = await this.#fetch(url, {
          method: 'POST',
          headers: { Authorization: `APIKey ${this.#apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });
        for (const interceptor of this.#extra.responseInterceptors ?? []) {
          await interceptor({ response, attempt, durationMs: Date.now() - startedAt });
        }
        const responseBody = await parseBody(response);
        if (response.ok) return responseBody;
        const error = errorFromResponse(response.status, responseBody);
        if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === this.#options.retries) throw error;
        lastError = error;
        this.#extra.logger?.warn('Retry do DataJud', { status: response.status, attempt });
      } catch (error) {
        if (callerSignal?.aborted) throw callerSignal.reason;
        if (timeoutController.signal.aborted) {
          throw new TimeoutError('Tempo limite da requisição ao DataJud excedido.', { cause: error });
        } else if (error instanceof DataJudError) {
          throw error;
        } else {
          throw new DataJudError(
            'A conexão com o DataJud foi interrompida antes de receber uma resposta. Tente novamente.',
            { cause: error },
          );
        }
      } finally {
        clearTimeout(timer);
      }
      const jitter = 0.5 + Math.random();
      await sleep(this.#options.retryDelay * 2 ** attempt * jitter, callerSignal);
    }
    throw lastError;
  }
}
