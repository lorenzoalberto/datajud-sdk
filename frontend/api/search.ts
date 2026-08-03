import {
  DataJudClient,
  DataJudError,
  ValidationError,
  type SearchRequest,
} from '@lorenzoalberto-dev/datajud-sdk';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const maxDuration = 60;

interface Request extends IncomingMessage {
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | readonly string[] | undefined>>;
}

let client: DataJudClient | undefined;

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function readBody(request: Request): Promise<unknown> {
  if (request.body !== undefined) {
    return typeof request.body === 'string' ? (JSON.parse(request.body) as unknown) : request.body;
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    if (typeof chunk === 'string' || chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    }
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function getTribunal(request: Request): string {
  const queryValue = request.query?.tribunal;
  if (typeof queryValue === 'string') return queryValue;
  const url = new URL(request.url ?? '/', 'https://datajud.local');
  return url.searchParams.get('tribunal') ?? '';
}

function getClient(): DataJudClient {
  if (client) return client;
  const apiKey = process.env.DATAJUD_API_KEY?.trim();
  if (!apiKey) throw new Error('DATAJUD_API_KEY não configurada.');
  client = new DataJudClient({ apiKey });
  return client;
}

export default async function handler(request: Request, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: 'Método não permitido.' });
    return;
  }

  try {
    const value = await readBody(request);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      sendJson(response, 400, { error: 'Corpo de pesquisa inválido.' });
      return;
    }
    const search = value as SearchRequest;
    if (
      search.query === undefined ||
      ('match_all' in search.query && Object.keys(search.query).length === 1)
    ) {
      sendJson(response, 400, { error: 'Informe pelo menos um filtro de pesquisa.' });
      return;
    }
    const size = Math.min(search.size ?? 10, 100);
    const from = Math.min(search.from ?? 0, 10_000);
    const result = await getClient().search(getTribunal(request), {
      query: search.query,
      size,
      from,
    });
    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: 'Corpo JSON inválido.' });
      return;
    }
    if (error instanceof DataJudError) {
      sendJson(response, error instanceof ValidationError ? 400 : (error.status ?? 502), {
        error: error.message,
        ...(error.status === undefined ? {} : { status: error.status }),
      });
      return;
    }
    console.error('[DataJud API]', error);
    sendJson(response, 500, { error: 'Não foi possível consultar o DataJud.' });
  }
}
