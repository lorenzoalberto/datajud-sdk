import type { Cache } from '../types/cache.js';
interface Entry { readonly value: unknown; readonly expiresAt?: number }
export class MemoryCache implements Cache {
  readonly #entries = new Map<string, Entry>();
  get<T>(key: string): T | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value as T;
  }
  set<T>(key: string, value: T, ttlMs?: number): void {
    this.#entries.set(key, { value, ...(ttlMs === undefined ? {} : { expiresAt: Date.now() + ttlMs }) });
  }
  delete(key: string): void { this.#entries.delete(key); }
  clear(): void { this.#entries.clear(); }
}
