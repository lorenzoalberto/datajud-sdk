import { ValidationError } from '../errors/index.js';
import type { DataJudField, QueryClause } from '../types/query.js';
import { normalizeNumeroProcesso } from '../utils/numero-processo.js';
import { validateCode, validateDate } from '../validators/search.js';

type Occurrence = 'must' | 'filter' | 'should' | 'must_not';
export class QueryBuilder {
  readonly #clauses: Record<Occurrence, QueryClause[]> = { must: [], filter: [], should: [], must_not: [] };
  #add(clause: QueryClause, occurrence: Occurrence): this { this.#clauses[occurrence].push(clause); return this; }
  numeroProcesso(value: string, occurrence: Occurrence = 'must'): this {
    const numero = normalizeNumeroProcesso(value);
    if (!/^\d{20}$/.test(numero)) throw new ValidationError('Número do processo deve conter 20 dígitos.');
    return this.#add({ match: { numeroProcesso: numero } }, occurrence);
  }
  classe(codigo: number, occurrence: Occurrence = 'must'): this {
    validateCode(codigo, 'classe'); return this.#add({ match: { 'classe.codigo': codigo } }, occurrence);
  }
  assunto(codigo: number, occurrence: Occurrence = 'must'): this {
    validateCode(codigo, 'assunto'); return this.#add({ match: { 'assuntos.codigo': codigo } }, occurrence);
  }
  orgaoJulgador(codigo: number, occurrence: Occurrence = 'must'): this {
    validateCode(codigo, 'órgão julgador'); return this.#add({ match: { 'orgaoJulgador.codigo': codigo } }, occurrence);
  }
  movimento(codigo: number, occurrence: Occurrence = 'must'): this {
    validateCode(codigo, 'movimento'); return this.#add({ match: { 'movimentos.codigo': codigo } }, occurrence);
  }
  tribunal(sigla: string, occurrence: Occurrence = 'must'): this {
    if (!sigla.trim()) throw new ValidationError('Tribunal é obrigatório.');
    return this.#add({ match: { tribunal: sigla.trim().toUpperCase() } }, occurrence);
  }
  dataAjuizamento(value: string | Date, occurrence: Occurrence = 'filter'): this {
    return this.#add({ match: { dataAjuizamento: validateDate(value) } }, occurrence);
  }
  intervaloDatas(inicio: string | Date, fim: string | Date, field: DataJudField = 'dataAjuizamento'): this {
    const gte = validateDate(inicio, 'data inicial');
    const lte = validateDate(fim, 'data final');
    if (gte > lte) throw new ValidationError('A data inicial não pode ser posterior à data final.');
    return this.#add({ range: { [field]: { gte, lte } } }, 'filter');
  }
  raw(clause: QueryClause, occurrence: Occurrence = 'must'): this { return this.#add(clause, occurrence); }
  build(): QueryClause {
    const populated = Object.entries(this.#clauses).filter(([, clauses]) => clauses.length > 0);
    if (populated.length === 0) return { match_all: {} };
    return { bool: Object.fromEntries(populated) };
  }
}
