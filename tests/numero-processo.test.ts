import { describe, expect, it } from 'vitest';
import { isValidNumeroProcesso, normalizeNumeroProcesso, parseNumeroProcesso } from '../src/index.js';

describe('número CNJ', () => {
  const numero = '0000832-35.2018.4.01.3202';
  it('remove máscara e valida módulo 97', () => {
    expect(normalizeNumeroProcesso(numero)).toBe('00008323520184013202');
    expect(isValidNumeroProcesso(numero)).toBe(true);
  });
  it('extrai os componentes e resolve o tribunal', () => {
    expect(parseNumeroProcesso(numero)).toMatchObject({ ano: 2018, segmento: 4, tribunal: '01', origem: '3202', alias: 'TRF1' });
  });
  it('recusa DV inválido', () => expect(() => parseNumeroProcesso('0000832-36.2018.4.01.3202')).toThrow());
});
