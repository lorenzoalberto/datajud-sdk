export interface DataJudErrorOptions {
  readonly status?: number;
  readonly body?: unknown;
  readonly cause?: unknown;
}

export class DataJudError extends Error {
  readonly status?: number;
  readonly body?: unknown;
  constructor(message: string, options: DataJudErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    if (options.status !== undefined) this.status = options.status;
    if (options.body !== undefined) this.body = options.body;
  }
}
export class AuthenticationError extends DataJudError {}
export class TimeoutError extends DataJudError {}
export class BadRequestError extends DataJudError {}
export class RateLimitError extends DataJudError {}
export class NotFoundError extends DataJudError {}
export class InternalServerError extends DataJudError {}
export class ValidationError extends DataJudError {}

export function errorFromResponse(status: number, body: unknown): DataJudError {
  const options = { status, body };
  if (status === 400) return new BadRequestError('Requisição inválida para o DataJud.', options);
  if (status === 401 || status === 403) return new AuthenticationError('Falha de autenticação no DataJud.', options);
  if (status === 404) return new NotFoundError('Endpoint do DataJud não encontrado.', options);
  if (status === 408) return new TimeoutError('O DataJud excedeu o tempo de resposta.', options);
  if (status === 429) return new RateLimitError('Limite de requisições do DataJud excedido.', options);
  if (status >= 500) return new InternalServerError('Erro interno do DataJud.', options);
  return new DataJudError(`O DataJud respondeu com HTTP ${status}.`, options);
}
