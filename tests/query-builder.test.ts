import { describe, expect, it } from 'vitest';
import { QueryBuilder } from '../src/index.js';

describe('QueryBuilder', () => {
  it('compõe filtros documentados', () => {
    expect(new QueryBuilder().classe(1116).orgaoJulgador(13597).build()).toEqual({
      bool: { must: [{ match: { 'classe.codigo': 1116 } }, { match: { 'orgaoJulgador.codigo': 13597 } }] },
    });
  });
  it('gera match_all vazio', () => expect(new QueryBuilder().build()).toEqual({ match_all: {} }));
  it('valida intervalo', () => expect(() => new QueryBuilder().intervaloDatas('2025-01-02', '2025-01-01')).toThrow());
});
