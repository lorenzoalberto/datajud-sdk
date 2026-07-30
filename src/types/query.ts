import type { Processo } from '../models/processo.js';

export type DataJudField =
  | 'id'
  | 'tribunal'
  | 'numeroProcesso'
  | 'dataAjuizamento'
  | 'grau'
  | 'nivelSigilo'
  | 'formato'
  | 'formato.codigo'
  | 'formato.nome'
  | 'sistema'
  | 'sistema.codigo'
  | 'sistema.nome'
  | 'classe'
  | 'classe.codigo'
  | 'classe.nome'
  | 'assuntos'
  | 'assuntos.codigo'
  | 'assuntos.nome'
  | 'orgaoJulgador'
  | 'orgaoJulgador.codigo'
  | 'orgaoJulgador.nome'
  | 'orgaoJulgador.codigoMunicipioIBGE'
  | 'movimentos'
  | 'movimentos.codigo'
  | 'movimentos.nome'
  | 'movimentos.dataHora'
  | 'movimentos.complementosTabelados'
  | 'movimentos.complementosTabelados.codigo'
  | 'movimentos.complementosTabelados.descricao'
  | 'movimentos.complementosTabelados.valor'
  | 'movimentos.complementosTabelados.nome'
  | 'movimentos.orgaoJulgador'
  | 'movimentos.orgaoJulgador.codigoOrgao'
  | 'movimentos.orgaoJulgador.nomeOrgao'
  | 'dataHoraUltimaAtualizacao'
  | '@timestamp';

export type Scalar = string | number | boolean | null;
export type QueryClause =
  | { match: Partial<Record<DataJudField, string | number | boolean>> }
  | { term: Partial<Record<DataJudField, Scalar>> }
  | { terms: Partial<Record<DataJudField, Scalar[]>> }
  | {
      range: Partial<
        Record<
          DataJudField,
          {
            gte?: string | number;
            gt?: string | number;
            lte?: string | number;
            lt?: string | number;
          }
        >
      >;
    }
  | { exists: { field: DataJudField } }
  | {
      bool: {
        must?: QueryClause[];
        filter?: QueryClause[];
        should?: QueryClause[];
        must_not?: QueryClause[];
        minimum_should_match?: number;
      };
    }
  | { match_all: Record<string, never> };

export type SortOrder = 'asc' | 'desc';
export type Sort = DataJudField | Partial<Record<DataJudField, SortOrder | { order: SortOrder }>>;
export type SearchAfterValue = string | number | boolean | null;

export interface SearchRequest {
  readonly query?: QueryClause;
  readonly _source?: readonly DataJudField[] | boolean;
  readonly size?: number;
  readonly from?: number;
  readonly sort?: readonly Sort[];
  readonly search_after?: readonly SearchAfterValue[];
  readonly track_total_hits?: boolean | number;
  readonly aggregations?: Readonly<Record<string, unknown>>;
}
export interface SearchOptions extends Omit<SearchRequest, '_source'> {
  /** Nome equivalente ao `_source` do Elasticsearch. */
  readonly source?: readonly DataJudField[] | boolean;
  readonly signal?: AbortSignal;
  readonly cacheTtlMs?: number;
}
export interface SearchHit<T = Processo> {
  readonly _index: string;
  readonly _type?: string;
  readonly _id: string;
  readonly _score: number | null;
  readonly _source: T;
  readonly sort?: readonly SearchAfterValue[];
}
export interface ShardInfo {
  readonly total: number;
  readonly successful: number;
  readonly skipped: number;
  readonly failed: number;
}
export interface Hits<T = Processo> {
  readonly total: { readonly value: number; readonly relation: 'eq' | 'gte' };
  readonly max_score: number | null;
  readonly hits: readonly SearchHit<T>[];
}
export interface SearchResponse<T = Processo> {
  readonly took: number;
  readonly timed_out: boolean;
  readonly _shards: ShardInfo;
  readonly hits: Hits<T>;
  readonly aggregations?: Readonly<Record<string, unknown>>;
}
