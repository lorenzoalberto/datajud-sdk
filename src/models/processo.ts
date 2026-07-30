export type Timestamp = string;
export interface CodigoNome { readonly codigo: number; readonly nome: string }
export type Classe = CodigoNome;
export type Assunto = CodigoNome;
export type Sistema = CodigoNome;
export type Formato = CodigoNome;
export interface OrgaoJulgador extends CodigoNome { readonly codigoMunicipioIBGE: number }
export interface OrgaoJulgadorMovimento { readonly codigoOrgao: number; readonly nomeOrgao: string }
export interface ComplementoTabelado {
  readonly codigo: number;
  readonly descricao: string;
  readonly valor: number;
  readonly nome: string;
}
export interface Movimento extends CodigoNome {
  readonly dataHora: Timestamp;
  readonly complementosTabelados?: readonly ComplementoTabelado[];
  readonly orgaoJulgador?: OrgaoJulgadorMovimento;
}
export interface Processo {
  readonly id: string;
  readonly tribunal: string;
  readonly numeroProcesso: string;
  readonly dataAjuizamento: Timestamp;
  readonly grau: string;
  readonly nivelSigilo: number;
  readonly formato: Formato;
  readonly sistema: Sistema;
  readonly classe: Classe;
  readonly assuntos: readonly Assunto[];
  readonly orgaoJulgador: OrgaoJulgador;
  readonly movimentos: readonly Movimento[];
  readonly dataHoraUltimaAtualizacao: Timestamp;
  readonly '@timestamp': Timestamp;
}
