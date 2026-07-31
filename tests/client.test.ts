import { describe, expect, it, vi } from 'vitest';
import { AuthenticationError, DataJudClient, RateLimitError } from '../src/index.js';

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
});
