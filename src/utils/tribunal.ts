import { DEFAULT_BASE_URL } from '../constants/api.js';
import { TRIBUNAL_ALIAS_SET, type TribunalAlias } from '../constants/tribunals.js';
import { ValidationError } from '../errors/index.js';

export function normalizeAlias(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^API_PUBLICA_/, '');
}

export function isTribunalAlias(value: string): value is TribunalAlias {
  return TRIBUNAL_ALIAS_SET.has(normalizeAlias(value));
}

export function assertTribunalAlias(value: string): asserts value is TribunalAlias {
  if (!isTribunalAlias(value))
    throw new ValidationError(`Alias de tribunal não suportado: ${value}`);
}

/** Resolve aliases publicados pelo CNJ. */
export function resolveAlias(alias: string, baseUrl = DEFAULT_BASE_URL): string {
  const normalized = normalizeAlias(alias);
  assertTribunalAlias(normalized);
  return `${baseUrl.replace(/\/+$/, '')}/api_publica_${normalized.toLowerCase()}/_search`;
}
