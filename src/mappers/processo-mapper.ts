import { ValidationError } from '../errors/index.js';
import type { Processo } from '../models/processo.js';
import type { SearchHit, SearchResponse } from '../types/query.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Mantém a representação oficial e falha quando a resposta não possui o esperado. */
export function mapSearchResponse<T = Processo>(value: unknown): SearchResponse<T> {
  if (!isRecord(value) || !isRecord(value.hits) || !Array.isArray(value.hits.hits)) {
    throw new ValidationError('Resposta do DataJud não possui o formato de busca esperado.');
  }
  return value as unknown as SearchResponse<T>;
}
export function mapHit<T = Processo>(hit: SearchHit<T>): T {
  return hit._source;
}
