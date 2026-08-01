export const DEFAULT_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';
export const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
export const DEFAULT_RATE_LIMIT = Object.freeze({
  maxRequests: 120,
  intervalMs: 60_000,
});
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 10_000;
