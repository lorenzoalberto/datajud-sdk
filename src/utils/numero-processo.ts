import { STATE_COURT_CODE_TO_UF, type TribunalAlias } from '../constants/tribunals.js';
import { ValidationError } from '../errors/index.js';

export interface NumeroProcesso {
  readonly numero: string;
  readonly sequencial: string;
  readonly digitoVerificador: string;
  readonly ano: number;
  readonly segmento: number;
  readonly tribunal: string;
  readonly origem: string;
  readonly alias?: TribunalAlias;
  readonly valido: boolean;
}

export function normalizeNumeroProcesso(value: string): string {
  return value.replace(/\D/g, '');
}

/** Algoritmo Módulo 97 obrigatório da Resolução CNJ 65/2008. */
export function isValidNumeroProcesso(value: string): boolean {
  const number = normalizeNumeroProcesso(value);
  if (!/^\d{20}$/.test(number)) return false;
  const base = `${number.slice(0, 7)}${number.slice(9)}${number.slice(7, 9)}`;
  let remainder = 0;
  for (const digit of base) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

function resolveTribunal(segment: number, code: string): TribunalAlias | undefined {
  const n = Number(code);
  if (segment === 3 && code === '00') return 'STJ';
  if (segment === 4 && n >= 1 && n <= 6) return `TRF${n}` as TribunalAlias;
  if (segment === 5 && n >= 1 && n <= 24) return `TRT${n}` as TribunalAlias;
  if (segment === 6) {
    const uf = STATE_COURT_CODE_TO_UF[code as keyof typeof STATE_COURT_CODE_TO_UF];
    return uf ? (`TRE-${uf}` as TribunalAlias) : undefined;
  }
  if (segment === 7 && code === '00') return 'STM';
  if (segment === 8) {
    const uf = STATE_COURT_CODE_TO_UF[code as keyof typeof STATE_COURT_CODE_TO_UF];
    return uf ? (`TJ${uf}` as TribunalAlias) : undefined;
  }
  if (segment === 9) {
    if (code === '13') return 'TJMMG';
    if (code === '21') return 'TJMRS';
    if (code === '26') return 'TJMSP';
  }
  return undefined;
}

export function parseNumeroProcesso(value: string, validateCheckDigit = true): NumeroProcesso {
  const numero = normalizeNumeroProcesso(value);
  if (!/^\d{20}$/.test(numero)) {
    throw new ValidationError('O número CNJ deve conter exatamente 20 dígitos.');
  }
  const valido = isValidNumeroProcesso(numero);
  if (validateCheckDigit && !valido) throw new ValidationError('Dígito verificador CNJ inválido.');
  const segmento = Number(numero.slice(13, 14));
  const tribunal = numero.slice(14, 16);
  const alias = resolveTribunal(segmento, tribunal);
  return {
    numero,
    sequencial: numero.slice(0, 7),
    digitoVerificador: numero.slice(7, 9),
    ano: Number(numero.slice(9, 13)),
    segmento,
    tribunal,
    origem: numero.slice(16, 20),
    ...(alias === undefined ? {} : { alias }),
    valido,
  };
}
