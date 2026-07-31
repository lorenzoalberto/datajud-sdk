import { describe, expect, it } from 'vitest';
import { TRIBUNAL_ALIASES, resolveAlias } from '../src/index.js';

describe('resolveAlias', () => {
  it('contém todos os 91 aliases publicados pelo CNJ', () => expect(TRIBUNAL_ALIASES).toHaveLength(91));
  it('normaliza alias e monta o endpoint oficial', () => {
    expect(resolveAlias(' tjSP ')).toBe('https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search');
    expect(resolveAlias('TRE-SP')).toContain('/api_publica_tre-sp/_search');
  });
  it('recusa aliases inexistentes', () => expect(() => resolveAlias('STF')).toThrow());
});
