import { describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  DataJudClient,
  DataJudError,
  RateLimitError,
  TimeoutError,
} from '../src/index.js';

const okBody = { took: 1, timed_out: false, _shards: { total: 1, successful: 1, skipped: 0, failed: 0 }, hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] } };
describe('DataJudClient', () => {
  it('envia autenticação, endpoint e source corretamente', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(okBody), { status: 200 }));
    const client = new DataJudClient({ apiKey: 'publica', fetch: fetchMock });
    await client.search('TJSP', { source: ['classe'], size: 10 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('api_publica_tjsp/_search');
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ Authorization: 'APIKey publica' });
    expect(typeof init?.body).toBe('string');
    expect(JSON.parse(init?.body as string)).toMatchObject({ _source: ['classe'], size: 10 });
  });
  it('mapeia erro de autenticação sem retry', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(new DataJudClient({ apiKey: 'x', fetch: fetchMock }).search('TJSP')).rejects.toBeInstanceOf(AuthenticationError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('repete 429 e retorna quando recupera', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(okBody), { status: 200 }));
    await expect(new DataJudClient({ apiKey: 'x', fetch: fetchMock, retryDelay: 0 }).search('TJSP')).resolves.toMatchObject({ took: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('expõe RateLimitError após esgotar tentativas', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 429 }));
    await expect(new DataJudClient({ apiKey: 'x', fetch: fetchMock, retries: 0 }).search('TJSP')).rejects.toBeInstanceOf(RateLimitError);
  });
  it('repete falhas de transporte', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('socket fechado'))
      .mockResolvedValueOnce(new Response(JSON.stringify(okBody), { status: 200 }));
    await expect(
      new DataJudClient({ apiKey: 'x', fetch: fetchMock, retryDelay: 0 }).search('TJSP'),
    ).resolves.toMatchObject({ took: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('preserva o erro de transporte após esgotar tentativas', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    await expect(
      new DataJudClient({ apiKey: 'x', fetch: fetchMock, retries: 0 }).search('TJSP'),
    ).rejects.toBeInstanceOf(DataJudError);
  });
  it('distingue timeout de cancelamento do chamador', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(
              init.signal?.reason instanceof Error
                ? init.signal.reason
                : new DOMException('Abortado', 'AbortError'),
            ),
          );
        }),
    );
    const request = new DataJudClient({
      apiKey: 'x',
      fetch: fetchMock,
      timeout: 10,
      retries: 0,
    }).search('TJSP');
    const expectation = expect(request).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await expectation;
    vi.useRealTimers();

    const controller = new AbortController();
    controller.abort(new Error('cancelado pelo teste'));
    await expect(
      new DataJudClient({ apiKey: 'x', fetch: fetchMock }).search('TJSP', {
        signal: controller.signal,
      }),
    ).rejects.toThrow('cancelado pelo teste');
  });
  it('pagina com search_after por meio do iterador', async () => {
    const page = (ids: readonly string[], cursor?: readonly number[]): typeof okBody => ({
      ...okBody,
      hits: {
        ...okBody.hits,
        hits: ids.map((id, index) => ({
          _index: 'api_publica_tjsp',
          _id: id,
          _score: null,
          _source: { id },
          sort: cursor ?? [index + 1],
        })),
      },
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(page(['a', 'b'])), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(page([])), { status: 200 }));
    const client = new DataJudClient({ apiKey: 'x', fetch: fetchMock });
    const ids: string[] = [];
    for await (const item of client.iterate<{ id: string }>('TJSP', { pageSize: 2 })) {
      ids.push(item.id);
    }
    expect(ids).toEqual(['a', 'b']);
    const secondBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as {
      search_after: readonly number[];
    };
    expect(secondBody.search_after).toEqual([2]);
  });
});
