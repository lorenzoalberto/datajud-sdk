import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from '../constants/api.js';
import { ValidationError } from '../errors/index.js';
import type { SearchRequest } from '../types/query.js';

export function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) throw new ValidationError(`${name} deve ser inteiro não negativo.`);
}
export function validateDate(value: string | Date, name = 'data'): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${name} inválida.`);
  return date.toISOString();
}
export function validateCode(value: number, name = 'código'): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new ValidationError(`${name} deve ser inteiro não negativo.`);
}
export function validateSearchRequest(request: SearchRequest): void {
  if (request.size !== undefined) {
    assertPositiveInteger(request.size, 'size');
    if (request.size < MIN_PAGE_SIZE || request.size > MAX_PAGE_SIZE) {
      throw new ValidationError(`size deve estar entre ${MIN_PAGE_SIZE} e ${MAX_PAGE_SIZE}.`);
    }
  }
  if (request.from !== undefined) assertPositiveInteger(request.from, 'from');
  if (request.search_after !== undefined && (!request.sort || request.sort.length === 0)) {
    throw new ValidationError('search_after exige sort.');
  }
  if (request.search_after !== undefined && request.from !== undefined) {
    throw new ValidationError('Não combine from com search_after.');
  }
}
