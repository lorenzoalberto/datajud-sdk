import { describe, expect, it, vi } from 'vitest';
import { MemoryCache } from '../src/index.js';

describe('MemoryCache', () => {
  it('expira entradas', () => {
    vi.useFakeTimers();
    const cache = new MemoryCache();
    cache.set('x', 1, 10);
    expect(cache.get('x')).toBe(1);
    vi.advanceTimersByTime(11);
    expect(cache.get('x')).toBeUndefined();
    vi.useRealTimers();
  });
});
