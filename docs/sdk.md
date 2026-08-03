# Guia e referência do DataJud SDK

Este documento descreve a API pública atualmente exportada pelo pacote `@lorenzoalberto-dev/datajud-sdk`.

## Sumário

- [Configuração do cliente](#configuração-do-cliente)
- [Construção de consultas](#construção-de-consultas)
- [Execução de pesquisas](#execução-de-pesquisas)
- [Paginação](#paginação)
- [Consulta por número CNJ](#consulta-por-número-cnj)
- [Cache](#cache)
- [Tratamento de erros](#tratamento-de-erros)
- [Aliases de tribunais](#aliases-de-tribunais)
- [Principais exportações](#principais-exportações)

## Configuração do cliente

Crie uma instância de `DataJudClient` com a chave vigente:

```ts
import { DataJudClient } from '@lorenzoalberto-dev/datajud-sdk';

const client = new DataJudClient({
  apiKey: process.env.DATAJUD_API_KEY!,
});
```

O valor pode ser informado com ou sem o prefixo `APIKey`. O SDK normaliza o cabeçalho de autenticação antes de enviar a requisição.

### Configuração completa

```ts
import { DataJudClient, MemoryCache } from '@lorenzoalberto-dev/datajud-sdk';

const client = new DataJudClient({
  apiKey: process.env.DATAJUD_API_KEY!,
  timeout: 30_000,
  retries: 3,
  retryDelay: 250,
  cache: new MemoryCache(),
  logger: console,
});
```

| Opção | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `apiKey` | `string` | obrigatória | Chave utilizada no cabeçalho `Authorization` |
| `timeout` | `number` | `30000` | Tempo máximo de cada requisição, em milissegundos |
| `retries` | `number` | `3` | Quantidade máxima de novas tentativas |
| `retryDelay` | `number` | `250` | Intervalo-base do backoff, em milissegundos |
| `baseUrl` | `string` | API oficial | URL-base para resolução dos endpoints |
| `logger` | `Logger` | — | Recebe eventos de depuração e novas tentativas |
| `rateLimit` | `RateLimitOptions \| false` | 120 por minuto | Ajusta o limite local; `false` delega o controle ao consumidor |
| `cache` | `Cache` | — | Define o armazenamento de respostas |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Permite fornecer outra implementação de `fetch` |

Respostas HTTP `408`, `429`, `500`, `502`, `503` e `504`, timeouts e falhas de transporte podem ser repetidos com backoff exponencial e jitter. O cabeçalho `Retry-After`, quando enviado em segundos, tem precedência sobre o backoff. Erros `400`, `401`, `403` e `404` não são repetidos.

O limite local de 120 requisições por janela de 60 segundos vem habilitado por padrão. Ele vale por instância de `DataJudClient`; aplicações com várias instâncias ou processos devem coordenar o limite externamente. Nesse caso, use `rateLimit: false`.

## Construção de consultas

`QueryBuilder` fornece métodos para os filtros processuais mais comuns:

```ts
import { QueryBuilder } from '@lorenzoalberto-dev/datajud-sdk';

const query = new QueryBuilder()
  .numeroProcesso('0000832-35.2018.4.01.3202')
  .classe(1116)
  .assunto(6017)
  .orgaoJulgador(13597)
  .movimento(26)
  .tribunal('TRF1')
  .build();
```

Cada filtro aceita uma ocorrência booleana quando aplicável:

```ts
const query = new QueryBuilder()
  .classe(1116, 'must')
  .movimento(26, 'must_not')
  .build();
```

Ocorrências disponíveis:

- `must`
- `filter`
- `should`
- `must_not`

Quando nenhum filtro é adicionado, `build()` retorna uma consulta `match_all`.

### Períodos

```ts
const query = new QueryBuilder()
  .intervaloDatas(
    '2024-01-01',
    '2024-12-31',
    'dataAjuizamento',
  )
  .build();
```

A data inicial não pode ser posterior à data final.

### Cláusulas personalizadas

Use `raw()` para adicionar uma cláusula tipada:

```ts
const query = new QueryBuilder()
  .raw({ exists: { field: 'movimentos' } }, 'filter')
  .raw({
    range: {
      dataAjuizamento: {
        gte: '2024-01-01',
        lt: '2025-01-01',
      },
    },
  }, 'filter')
  .build();
```

O tipo `QueryClause` contempla `match`, `term`, `terms`, `range`, `exists`, `bool` e `match_all`.

## Execução de pesquisas

`search()` recebe o alias do tribunal e as opções da pesquisa:

```ts
const response = await client.search('TJSP', {
  query: new QueryBuilder().classe(1116).build(),
  source: [
    'numeroProcesso',
    'classe',
    'dataAjuizamento',
    '@timestamp',
  ],
  size: 50,
  sort: [{ '@timestamp': { order: 'desc' } }],
  track_total_hits: true,
});
```

O retorno é um `SearchResponse<T>` com o envelope do DataJud:

```ts
console.log(response.took);
console.log(response.timed_out);
console.log(response._shards);
console.log(response.hits.total);
console.log(response.hits.hits);
```

### Opções de pesquisa

| Opção | Finalidade |
| --- | --- |
| `query` | Cláusula Query DSL enviada ao DataJud |
| `source` | Campos retornados em `_source`, ou um booleano |
| `size` | Quantidade de registros, entre 1 e 10.000 |
| `from` | Deslocamento para paginação simples |
| `sort` | Critérios de ordenação |
| `search_after` | Cursor para a próxima página |
| `track_total_hits` | Controla a contagem total de resultados |
| `aggregations` | Agregações compatíveis com o endpoint |
| `signal` | `AbortSignal` para cancelamento |
| `cacheTtlMs` | Tempo de retenção da resposta no cache |

`from` e `search_after` não podem ser utilizados simultaneamente.

### Cancelamento

```ts
const controller = new AbortController();

const request = client.search('TJSP', {
  query: new QueryBuilder().classe(1116).build(),
  signal: controller.signal,
});

controller.abort();
await request;
```

### Agregações

```ts
const response = await client.search('TJSP', {
  query: new QueryBuilder().classe(1116).build(),
  size: 1,
  aggregations: {
    porClasse: {
      terms: { field: 'classe.codigo' },
    },
  },
});
```

As agregações são expostas no campo opcional `response.aggregations`.

## Paginação

`iterate()` percorre os resultados com `search_after` e entrega diretamente o conteúdo de `_source`:

```ts
const query = new QueryBuilder()
  .intervaloDatas('2024-01-01', '2024-12-31')
  .build();

for await (const processo of client.iterate('TJDFT', {
  query,
  source: ['numeroProcesso', '@timestamp'],
  pageSize: 500,
})) {
  console.log(processo.numeroProcesso);
}
```

Na ausência de uma ordenação explícita, o iterador utiliza `@timestamp` e `id` em ordem crescente. A resposta precisa incluir os valores de `sort` para que o cursor avance.

O iterador interrompe a operação se a resposta não trouxer o cursor ou se o mesmo cursor for devolvido em páginas consecutivas, evitando um laço infinito.

## Consulta por número CNJ

`ProcessosService` analisa o número, resolve o alias do tribunal e executa a consulta:

```ts
import { DataJudClient, ProcessosService } from '@lorenzoalberto-dev/datajud-sdk';

const client = new DataJudClient({
  apiKey: process.env.DATAJUD_API_KEY!,
});

const processos = new ProcessosService(client);

const response = await processos.porNumero(
  '0000832-35.2018.4.01.3202',
);
```

Caso o segmento e o código não correspondam a um endpoint público conhecido, o serviço interrompe a operação sem presumir um tribunal.

### Análise isolada do número

```ts
import {
  isValidNumeroProcesso,
  parseNumeroProcesso,
} from '@lorenzoalberto-dev/datajud-sdk';

const valido = isValidNumeroProcesso(
  '0000832-35.2018.4.01.3202',
);

const parsed = parseNumeroProcesso(
  '0000832-35.2018.4.01.3202',
);

console.log(valido);
console.log(parsed.alias); // TRF1
```

O parser:

- remove caracteres de formatação;
- exige exatamente 20 dígitos;
- valida o dígito verificador pelo Módulo 97;
- separa sequencial, dígito, ano, segmento, tribunal e origem;
- resolve o alias do endpoint quando existe uma correspondência pública.

Para obter a estrutura mesmo quando o dígito verificador for inválido, passe `false` como segundo argumento de `parseNumeroProcesso`.

## Cache

O SDK inclui `MemoryCache`, com expiração opcional:

```ts
import {
  DataJudClient,
  MemoryCache,
  QueryBuilder,
} from '@lorenzoalberto-dev/datajud-sdk';

const client = new DataJudClient({
  apiKey: process.env.DATAJUD_API_KEY!,
  cache: new MemoryCache(),
});

const response = await client.search('TJSP', {
  query: new QueryBuilder().classe(1116).build(),
  cacheTtlMs: 30_000,
});
```

O cache somente é consultado quando `cacheTtlMs` é informado na pesquisa. Uma implementação alternativa pode cumprir a interface `Cache`:

```ts
interface Cache {
  get<T>(key: string): T | undefined | Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;
}
```

## Tratamento de erros

Todos os erros próprios do SDK estendem `DataJudError`:

```ts
import {
  AuthenticationError,
  DataJudError,
  RateLimitError,
  ValidationError,
} from '@lorenzoalberto-dev/datajud-sdk';

try {
  await client.search('TJSP');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('A chave foi recusada.');
  } else if (error instanceof RateLimitError) {
    console.error('O limite de requisições foi excedido.');
  } else if (error instanceof ValidationError) {
    console.error(error.message);
  } else if (error instanceof DataJudError) {
    console.error(error.status, error.body);
  }
}
```

| Classe | Situação |
| --- | --- |
| `AuthenticationError` | Resposta HTTP 401 ou 403 |
| `BadRequestError` | Resposta HTTP 400 |
| `InternalServerError` | Resposta HTTP 5xx |
| `NotFoundError` | Resposta HTTP 404 |
| `RateLimitError` | Resposta HTTP 429 |
| `TimeoutError` | Resposta HTTP 408 ou timeout local |
| `ValidationError` | Parâmetro inválido antes da requisição |

`DataJudError` pode expor `status`, `body` e `cause`, conforme a origem da falha.

## Aliases de tribunais

O SDK exporta `TRIBUNAL_ALIASES` com os endpoints publicados que reconhece. Também fornece:

```ts
import {
  assertTribunalAlias,
  isTribunalAlias,
  normalizeAlias,
  resolveAlias,
} from '@lorenzoalberto-dev/datajud-sdk';

isTribunalAlias('TJSP');
normalizeAlias('api_publica_tjsp');
assertTribunalAlias('TJSP');
resolveAlias('TJSP');
```

`resolveAlias('TJSP')` produz:

```text
https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search
```

## Principais exportações

| Exportação | Finalidade |
| --- | --- |
| `DataJudClient` | Executa pesquisas e paginação assíncrona |
| `QueryBuilder` | Constrói consultas tipadas |
| `ProcessosService` | Pesquisa por número processual CNJ |
| `MemoryCache` | Mantém respostas em memória |
| `parseNumeroProcesso` | Analisa e valida um número processual |
| `isValidNumeroProcesso` | Verifica o dígito de um número CNJ |
| `resolveAlias` | Converte um alias em endpoint de pesquisa |
| `TRIBUNAL_ALIASES` | Lista os aliases reconhecidos |
| `Processo` | Representa os metadados processuais |
| `SearchOptions` | Define os parâmetros de pesquisa |
| `SearchResponse` | Representa o envelope de resposta |

Todos os contratos públicos são reexportados pelo ponto de entrada principal do pacote.
