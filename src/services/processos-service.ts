import type { DataJudClient } from '../client/datajud-client.js';
import type { Processo } from '../models/processo.js';
import { QueryBuilder } from '../queries/query-builder.js';
import type { SearchOptions, SearchResponse } from '../types/query.js';
import { parseNumeroProcesso } from '../utils/numero-processo.js';

export class ProcessosService {
  constructor(private readonly client: DataJudClient) {}
  porNumero(numero: string, options: Omit<SearchOptions, 'query'> = {}): Promise<SearchResponse<Processo>> {
    const parsed = parseNumeroProcesso(numero);
    if (!parsed.alias) throw new Error('Não foi possível resolver um endpoint público para esse número CNJ.');
    return this.client.search(parsed.alias, { ...options, query: new QueryBuilder().numeroProcesso(parsed.numero).build() });
  }
}
