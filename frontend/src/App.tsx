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
} from '@datajud/sdk';

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
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
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
          <h3>{processo.numeroProcesso}</h3>
        </div>
        <span className={`privacy privacy-${processo.nivelSigilo}`}>
          Sigilo {processo.nivelSigilo}
        </span>
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
          {open ? 'Ocultar JSON' : 'Ver JSON completo'}
        </button>
      </div>
      {open && <pre>{JSON.stringify(hit, null, 2)}</pre>}
    </article>
  );
}

export function App() {
  const [form, setForm] = useState(initialForm);
  const [response, setResponse] = useState<SearchResponse<Processo>>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setResponse(undefined);
    if (!apiKey) {
      setError('Configure VITE_DATAJUD_API_KEY no arquivo frontend/.env.');
      return;
    }
    try {
      setLoading(true);
      const builder = new QueryBuilder();
      if (form.numero) builder.numeroProcesso(form.numero);
      if (form.classe) builder.classe(Number(form.classe));
      if (form.assunto) builder.assunto(Number(form.assunto));
      if (form.orgao) builder.orgaoJulgador(Number(form.orgao));
      if (form.movimento) builder.movimento(Number(form.movimento));
      if (form.inicio && form.fim) builder.intervaloDatas(form.inicio, form.fim);
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
        <form className="search-panel" onSubmit={(event) => void submit(event)}>
          <div className="panel-heading">
            <div>
              <span className="step">01</span>
              <h2>Parâmetros da consulta</h2>
            </div>
            <button className="clear-button" type="button" onClick={() => setForm(initialForm)}>
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
                type="date"
                value={form.inicio}
                onChange={(e) => update('inicio', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Data final</span>
              <input type="date" value={form.fim} onChange={(e) => update('fim', e.target.value)} />
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
                {response.hits.total.value.toLocaleString('pt-BR')} encontrados · {response.took} ms
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
        </section>
      </main>
      <footer>
        <span>Dados fornecidos pela API Pública do DataJud/CNJ</span>
        <span>Projeto independente, sem vínculo oficial com o CNJ.</span>
      </footer>
    </div>
  );
}
