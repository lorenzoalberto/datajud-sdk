const superior = ['TST', 'TSE', 'STJ', 'STM'] as const;
const federal = ['TRF1', 'TRF2', 'TRF3', 'TRF4', 'TRF5', 'TRF6'] as const;
const estadual = [
  'TJAC', 'TJAL', 'TJAM', 'TJAP', 'TJBA', 'TJCE', 'TJDFT', 'TJES', 'TJGO',
  'TJMA', 'TJMG', 'TJMS', 'TJMT', 'TJPA', 'TJPB', 'TJPE', 'TJPI', 'TJPR',
  'TJRJ', 'TJRN', 'TJRO', 'TJRR', 'TJRS', 'TJSC', 'TJSE', 'TJSP', 'TJTO',
] as const;
const trabalho = [
  'TRT1', 'TRT2', 'TRT3', 'TRT4', 'TRT5', 'TRT6', 'TRT7', 'TRT8', 'TRT9',
  'TRT10', 'TRT11', 'TRT12', 'TRT13', 'TRT14', 'TRT15', 'TRT16', 'TRT17',
  'TRT18', 'TRT19', 'TRT20', 'TRT21', 'TRT22', 'TRT23', 'TRT24',
] as const;
const ufs = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DFT', 'ES', 'GO', 'MA', 'MG', 'MS',
  'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC',
  'SE', 'SP', 'TO',
] as const;
const eleitoral = ufs.map((uf) => `TRE-${uf}` as const);
const militar = ['TJMMG', 'TJMRS', 'TJMSP'] as const;

/** Aliases publicados na página oficial de endpoints da API Pública. */
export const TRIBUNAL_ALIASES = [
  ...superior, ...federal, ...estadual, ...trabalho, ...eleitoral, ...militar,
] as const;
export type TribunalAlias = (typeof TRIBUNAL_ALIASES)[number];
export const TRIBUNAL_ALIAS_SET: ReadonlySet<string> = new Set(TRIBUNAL_ALIASES);

export const STATE_COURT_CODE_TO_UF = {
  '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA', '06': 'CE',
  '07': 'DFT', '08': 'ES', '09': 'GO', '10': 'MA', '11': 'MT', '12': 'MS',
  '13': 'MG', '14': 'PA', '15': 'PB', '16': 'PR', '17': 'PE', '18': 'PI',
  '19': 'RJ', '20': 'RN', '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC',
  '25': 'SE', '26': 'SP', '27': 'TO',
} as const;
