export { MemoryCache } from './cache/memory-cache.js';
export { DataJudClient } from './client/datajud-client.js';
export { TRIBUNAL_ALIASES } from './constants/tribunals.js';
export type { TribunalAlias } from './constants/tribunals.js';
export {
  AuthenticationError,
  BadRequestError,
  DataJudError,
  InternalServerError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from './errors/index.js';
export type { DataJudErrorOptions } from './errors/index.js';
export type {
  Assunto,
  Classe,
  CodigoNome,
  ComplementoTabelado,
  Formato,
  Movimento,
  OrgaoJulgador,
  OrgaoJulgadorMovimento,
  Processo,
  Sistema,
  Timestamp,
} from './models/processo.js';
export { QueryBuilder } from './queries/query-builder.js';
export { ProcessosService } from './services/processos-service.js';
export type { Cache } from './types/cache.js';
export type {
  DataJudClientOptions,
  Logger,
  RateLimitOptions,
} from './types/client.js';
export type {
  DataJudField,
  Hits,
  QueryClause,
  Scalar,
  SearchAfterValue,
  SearchHit,
  SearchOptions,
  SearchRequest,
  SearchResponse,
  ShardInfo,
  Sort,
  SortOrder,
} from './types/query.js';
export {
  isValidNumeroProcesso,
  normalizeNumeroProcesso,
  parseNumeroProcesso,
} from './utils/numero-processo.js';
export type { NumeroProcesso } from './utils/numero-processo.js';
export {
  assertTribunalAlias,
  isTribunalAlias,
  normalizeAlias,
  resolveAlias,
} from './utils/tribunal.js';
