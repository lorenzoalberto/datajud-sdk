import { Component, type ErrorInfo, type FormEvent, type ReactNode, useState } from 'react';
import {
  QueryBuilder,
  TRIBUNAL_ALIASES,
  parseNumeroProcesso,
  resolveAlias,
  type Processo,
  type SearchHit,
  type SearchResponse,
  type TribunalAlias,
} from '@lorenzoalberto-dev/datajud-sdk';

type FormState = {
  tribunal: TribunalAlias;
  numero: string;
  classe: string;
  assunto: string;
  orgao: string;
  movimento: string;
  inicio: string;
  fim: string;
  size: string;
};

const initialForm: FormState = {
  tribunal: 'TJSP',
  numero: '',
  classe: '',
  assunto: '',
  orgao: '',
  movimento: '',
  inicio: '',
  fim: '',
  size: '10',
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatProcessNumber = (value?: string) => {
  if (!value) return 'Não informado';
  const digits = onlyDigits(value).slice(0, 20);
  if (digits.length !== 20) return value;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
};

const formatDateInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
};

const parseDateInput = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCDate() !== Number(day) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCFullYear() !== Number(year)
  ) {
    return undefined;
  }
  return `${year}-${month}-${day}`;
};

const parseDataJudDate = (value: string): Date | undefined => {
  const compact = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value);
  const normalized = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatDate = (value?: string) => {
  if (!value) return 'Não informado';
  const date = parseDataJudDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Não informado';
  const date = parseDataJudDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
};

const namedValue = (value?: { codigo?: number; nome?: string }) =>
  value?.nome ? `${value.nome}${value.codigo !== undefined ? ` (${value.codigo})` : ''}` : 'Não informado';

const paginationItems = (current: number, total: number): Array<number | 'ellipsis'> => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const visible = [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  visible.forEach((page, index) => {
    if (index > 0 && page - visible[index - 1] > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
};

class ResultErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao renderizar resposta do DataJud', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-box">
          <strong>A consulta respondeu, mas um campo não pôde ser exibido</strong>
          <p>{this.state.error.message}</p>
          <button
            className="text-button"
            type="button"
            onClick={() => this.setState({ error: null })}
          >
            Voltar à consulta
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ResultCard({ hit }: { hit: SearchHit<Processo> }) {
  const [open, setOpen] = useState(false);
  const processo = hit._source;
  return (
    <article className="result-card">
      <div className="result-topline">
        <div>
          <span className="eyebrow">{processo.tribunal}</span>
          <h3>{formatProcessNumber(processo.numeroProcesso)}</h3>
        </div>
      </div>
      <div className="result-grid">
        <div>
          <span>Classe</span>
          <strong>{processo.classe?.nome ?? 'Não informada'}</strong>
        </div>
        <div>
          <span>Órgão julgador</span>
          <strong>{processo.orgaoJulgador?.nome ?? 'Não informado'}</strong>
        </div>
        <div>
          <span>Grau</span>
          <strong>{processo.grau ?? '—'}</strong>
        </div>
        <div>
          <span>Ajuizamento</span>
          <strong>{formatDate(processo.dataAjuizamento)}</strong>
        </div>
      </div>
      <div className="result-footer">
        <span>{processo.movimentos?.length ?? 0} movimentações</span>
        <button className="text-button" type="button" onClick={() => setOpen(!open)}>
          {open ? 'Ocultar detalhes' : 'Ver detalhes do processo'}
        </button>
      </div>
      {open && (
        <div className="process-details">
          <section className="detail-section">
            <h4>Informações do processo</h4>
            <dl className="detail-grid">
              <div><dt>Número</dt><dd>{formatProcessNumber(processo.numeroProcesso)}</dd></div>
              <div><dt>Tribunal</dt><dd>{processo.tribunal || 'Não informado'}</dd></div>
              <div><dt>Classe</dt><dd>{namedValue(processo.classe)}</dd></div>
              <div><dt>Órgão julgador</dt><dd>{namedValue(processo.orgaoJulgador)}</dd></div>
              <div><dt>Grau</dt><dd>{processo.grau || 'Não informado'}</dd></div>
              <div><dt>Nível de sigilo</dt><dd>{processo.nivelSigilo ?? 'Não informado'}</dd></div>
              <div><dt>Sistema</dt><dd>{namedValue(processo.sistema)}</dd></div>
              <div><dt>Formato</dt><dd>{namedValue(processo.formato)}</dd></div>
              <div><dt>Data de ajuizamento</dt><dd>{formatDate(processo.dataAjuizamento)}</dd></div>
              <div><dt>Última atualização</dt><dd>{formatDateTime(processo.dataHoraUltimaAtualizacao)}</dd></div>
            </dl>
          </section>

          <section className="detail-section">
            <h4>Assuntos</h4>
            {processo.assuntos?.length ? (
              <ul className="tag-list">
                {processo.assuntos.map((assunto, index) => (
                  <li key={`${assunto.codigo}-${index}`}>{namedValue(assunto)}</li>
                ))}
              </ul>
            ) : <p className="detail-empty">Nenhum assunto informado.</p>}
          </section>

          <section className="detail-section">
            <h4>Movimentações ({processo.movimentos?.length ?? 0})</h4>
            {processo.movimentos?.length ? (
              <ol className="movement-list">
                {processo.movimentos.map((movimento, index) => (
                  <li key={`${movimento.codigo}-${movimento.dataHora}-${index}`}>
                    <div className="movement-heading">
                      <span>Movimentação {index + 1}</span>
                      <strong>{movimento.nome || 'Sem nome informado'}</strong>
                    </div>
                    <dl className="movement-fields">
                      <div>
                        <dt>Data e hora</dt>
                        <dd>{formatDateTime(movimento.dataHora)}</dd>
                      </div>
                      <div>
                        <dt>Código</dt>
                        <dd>{movimento.codigo}</dd>
                      </div>
                    </dl>

                    {movimento.orgaoJulgador && (
                      <section className="nested-data">
                        <h5>Órgão julgador</h5>
                        <dl className="movement-fields">
                          <div>
                            <dt>Nome do órgão</dt>
                            <dd>{movimento.orgaoJulgador.nomeOrgao || 'Não informado'}</dd>
                          </div>
                          <div>
                            <dt>Código do órgão</dt>
                            <dd>{movimento.orgaoJulgador.codigoOrgao}</dd>
                          </div>
                        </dl>
                      </section>
                    )}

                    {!!movimento.complementosTabelados?.length && (
                      <section className="nested-data">
                        <h5>Complementos tabelados</h5>
                        <div className="complement-list">
                          {movimento.complementosTabelados.map((complemento, itemIndex) => (
                            <article key={`${complemento.codigo}-${itemIndex}`}>
                              <h6>{complemento.nome || `Complemento ${itemIndex + 1}`}</h6>
                              <dl className="complement-fields">
                                <div>
                                  <dt>Descrição</dt>
                                  <dd>{complemento.descricao || 'Não informada'}</dd>
                                </div>
                                <div>
                                  <dt>Valor</dt>
                                  <dd>{complemento.valor}</dd>
                                </div>
                                <div>
                                  <dt>Código</dt>
                                  <dd>{complemento.codigo}</dd>
                                </div>
                              </dl>
                            </article>
                          ))}
                        </div>
                      </section>
                    )}
                  </li>
                ))}
              </ol>
            ) : <p className="detail-empty">Nenhuma movimentação informada.</p>}
          </section>
        </div>
      )}
    </article>
  );
}

export function App() {
  const [form, setForm] = useState(initialForm);
  const [response, setResponse] = useState<SearchResponse<Processo>>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const apiKey = import.meta.env.VITE_DATAJUD_API_KEY as string | undefined;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onNumberChange = (value: string) => {
    update('numero', value);
    try {
      const parsed = parseNumeroProcesso(value);
      if (parsed.alias) update('tribunal', parsed.alias);
    } catch {
      // O usuário ainda pode estar digitando.
    }
  };

  const search = async (requestedPage: number) => {
    setError(undefined);
    setResponse(undefined);
    if (!apiKey) {
      setError('Configure VITE_DATAJUD_API_KEY no arquivo frontend/.env.');
      return;
    }
    try {
      setLoading(true);
      const inicio = form.inicio ? parseDateInput(form.inicio) : undefined;
      const fim = form.fim ? parseDateInput(form.fim) : undefined;
      if ((form.inicio && !inicio) || (form.fim && !fim)) {
        setError('Informe datas válidas no formato DD/MM/AAAA, sempre com o ano em 4 dígitos.');
        return;
      }
      if ((inicio && !fim) || (!inicio && fim)) {
        setError('Informe a data inicial e a data final para pesquisar por período.');
        return;
      }
      const builder = new QueryBuilder();
      if (form.numero) builder.numeroProcesso(form.numero);
      if (form.classe) builder.classe(Number(form.classe));
      if (form.assunto) builder.assunto(Number(form.assunto));
      if (form.orgao) builder.orgaoJulgador(Number(form.orgao));
      if (form.movimento) builder.movimento(Number(form.movimento));
      if (inicio && fim) builder.intervaloDatas(inicio, fim);
      const hasFilter = Boolean(
        form.numero ||
        form.classe ||
        form.assunto ||
        form.orgao ||
        form.movimento ||
        (form.inicio && form.fim),
      );
      if (!hasFilter) {
        setError(
          'Informe pelo menos um filtro. Consultas abertas costumam ser bloqueadas ou expirar no DataJud.',
        );
        return;
      }
      const httpResponse = await fetch(resolveAlias(form.tribunal, '/api'), {
        method: 'POST',
        headers: {
          Authorization: `APIKey ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: builder.build(),
          size: Number(form.size),
          from: (requestedPage - 1) * Number(form.size),
        }),
      });
      const responseText = await httpResponse.text();
      let payload: unknown;
      try {
        payload = JSON.parse(responseText) as unknown;
      } catch {
        payload = responseText;
      }
      if (!httpResponse.ok) {
        const apiMessage =
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : `A consulta respondeu com HTTP ${httpResponse.status}.`;
        throw new Error(apiMessage);
      }
      setResponse(payload as SearchResponse<Processo>);
      setPage(requestedPage);
    } catch (reason) {
      setError(
        reason instanceof TypeError
          ? 'O servidor local foi desconectado. Confirme se o terminal com “npm start” continua aberto.'
          : reason instanceof Error
            ? reason.message
            : 'Não foi possível consultar o DataJud.',
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void search(1);
  };

  const pageSize = Number(form.size);
  const accessibleResults = response ? Math.min(response.hits.total.value, 10_000) : 0;
  const totalPages = Math.ceil(accessibleResults / pageSize);

  return (
    <div className="page">
      <header className="hero">
        <div className="brand">
          <span className="brand-mark">DJ</span>
        </div>
        <div className="hero-content">
          <span className="eyebrow">Consulta pública · CNJ</span>
          <h1>Interface de demonstração</h1>
          <p>Uma interface local e independente construída sobre o SDK TypeScript DataJud.</p>
        </div>
      </header>

      <main>
        <form className="search-panel" onSubmit={submit}>
          <div className="panel-heading">
            <div>
              <span className="step">01</span>
              <h2>Parâmetros da consulta</h2>
            </div>
            <button
              className="clear-button"
              type="button"
              onClick={() => {
                setForm(initialForm);
                setPage(1);
              }}
            >
              Limpar
            </button>
          </div>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Número do processo</span>
              <input
                value={form.numero}
                onChange={(e) => onNumberChange(e.target.value)}
                placeholder="0000832-35.2018.4.01.3202"
              />
              <small>O tribunal é identificado automaticamente quando possível.</small>
            </label>
            <label className="field">
              <span>Tribunal</span>
              <select
                value={form.tribunal}
                onChange={(e) => update('tribunal', e.target.value as TribunalAlias)}
              >
                {TRIBUNAL_ALIASES.map((alias) => (
                  <option key={alias}>{alias}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Código da classe</span>
              <input
                type="number"
                min="0"
                value={form.classe}
                onChange={(e) => update('classe', e.target.value)}
                placeholder="Ex.: 1116"
              />
            </label>
            <label className="field">
              <span>Código do assunto</span>
              <input
                type="number"
                min="0"
                value={form.assunto}
                onChange={(e) => update('assunto', e.target.value)}
                placeholder="Ex.: 6017"
              />
            </label>
            <label className="field">
              <span>Órgão julgador</span>
              <input
                type="number"
                min="0"
                value={form.orgao}
                onChange={(e) => update('orgao', e.target.value)}
                placeholder="Ex.: 13597"
              />
            </label>
            <label className="field">
              <span>Movimentação</span>
              <input
                type="number"
                min="0"
                value={form.movimento}
                onChange={(e) => update('movimento', e.target.value)}
                placeholder="Ex.: 26"
              />
            </label>
            <label className="field">
              <span>Data inicial</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={form.inicio}
                onChange={(e) => update('inicio', formatDateInput(e.target.value))}
                placeholder="DD/MM/AAAA"
                aria-label="Data inicial no formato dia, mês e ano"
              />
            </label>
            <label className="field">
              <span>Data final</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={form.fim}
                onChange={(e) => update('fim', formatDateInput(e.target.value))}
                placeholder="DD/MM/AAAA"
                aria-label="Data final no formato dia, mês e ano"
              />
            </label>
            <label className="field">
              <span>Resultados</span>
              <select value={form.size} onChange={(e) => update('size', e.target.value)}>
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <p>Use um ou mais filtros. Sem filtros, serão exibidos os registros mais recentes.</p>
            <button className="primary-button" disabled={loading}>
              {loading ? 'Consultando…' : 'Consultar DataJud'}
              <span>→</span>
            </button>
          </div>
        </form>

        <section className="results">
          <div className="section-heading">
            <div>
              <span className="step">02</span>
              <h2>Resultados</h2>
            </div>
            {response && (
              <span className="count">
                {response.hits.total.value.toLocaleString('pt-BR')} encontrados
              </span>
            )}
          </div>
          {!response && !error && !loading && (
            <div className="empty">
              <span>⌕</span>
              <h3>Sua pesquisa aparecerá aqui</h3>
              <p>Preencha os parâmetros acima para começar.</p>
            </div>
          )}
          {loading && (
            <div className="empty">
              <span className="spinner" />
              <h3>Consultando os índices do CNJ…</h3>
            </div>
          )}
          {error && (
            <div className="error-box">
              <strong>Não foi possível concluir a consulta</strong>
              <p>{error}</p>
            </div>
          )}
          {response?.hits.hits.length === 0 && (
            <div className="empty">
              <span>0</span>
              <h3>Nenhum processo encontrado</h3>
              <p>Tente remover filtros ou confira os códigos informados.</p>
            </div>
          )}
          <ResultErrorBoundary>
            <div className="result-list">
              {response?.hits.hits.map((hit) => (
                <ResultCard key={hit._id} hit={hit} />
              ))}
            </div>
          </ResultErrorBoundary>
          {response && response.hits.hits.length > 0 && totalPages > 1 && (
            <nav className="pagination" aria-label="Paginação dos resultados">
              <button
                type="button"
                disabled={page === 1 || loading}
                onClick={() => void search(page - 1)}
              >
                ← Anterior
              </button>
              <div className="pagination-pages">
                {paginationItems(page, totalPages).map((item, index) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} aria-hidden="true">…</span>
                  ) : (
                    <button
                      type="button"
                      key={item}
                      className={item === page ? 'active' : undefined}
                      aria-current={item === page ? 'page' : undefined}
                      disabled={loading}
                      onClick={() => void search(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                disabled={page === totalPages || loading}
                onClick={() => void search(page + 1)}
              >
                Próxima →
              </button>
            </nav>
          )}
        </section>
      </main>
      <footer>
        <span>Dados fornecidos pela API Pública do DataJud/CNJ</span>
        <span>Projeto independente, sem vínculo oficial com o CNJ.</span>
      </footer>
    </div>
  );
}
