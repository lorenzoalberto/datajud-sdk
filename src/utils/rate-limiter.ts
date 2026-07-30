import type { RateLimitOptions } from '../types/client.js';
export class RateLimiter {
  readonly #timestamps: number[] = [];
  constructor(private readonly options: RateLimitOptions) {}
  async acquire(signal?: AbortSignal): Promise<void> {
    while (true) {
      const now = Date.now();
      while (this.#timestamps[0] !== undefined && this.#timestamps[0] <= now - this.options.intervalMs) this.#timestamps.shift();
      if (this.#timestamps.length < this.options.maxRequests) { this.#timestamps.push(now); return; }
      const wait = Math.max(1, this.#timestamps[0]! + this.options.intervalMs - now);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, wait);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(signal.reason instanceof Error ? signal.reason : new Error('Operação abortada.'));
        }, { once: true });
      });
    }
  }
}
