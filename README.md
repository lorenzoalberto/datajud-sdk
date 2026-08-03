<div align="center">

# DataJud SDK

SDK TypeScript enxuto, tipado e independente de frameworks para a API Pública do DataJud.

[![npm](https://img.shields.io/npm/v/@lorenzoalberto-dev/datajud-sdk?color=CB3837&logo=npm)](https://www.npmjs.com/package/@lorenzoalberto-dev/datajud-sdk)
[![CI](https://github.com/lorenzoalberto/datajud-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/lorenzoalberto/datajud-sdk/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/@lorenzoalberto-dev/datajud-sdk)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/@lorenzoalberto-dev/datajud-sdk)](LICENSE)

```bash
npm install @lorenzoalberto-dev/datajud-sdk
```

</div>

Consulte processos, componha Query DSL com segurança, resolva tribunais pelo número CNJ e percorra grandes conjuntos de resultados sem lidar diretamente com os detalhes do Elasticsearch.

> Projeto independente, sem vínculo oficial com o Conselho Nacional de Justiça. A API Pública do DataJud está sujeita a alterações.

## Por que usar

- API pequena e centrada em `DataJudClient.search()`
- Tipagem completa para consultas, processos e respostas
- Query Builder para os filtros processuais mais comuns
- Paginação contínua com `search_after` e Async Iterator
- Normalização e validação de números processuais CNJ
- Resolução automática de tribunais
- Timeout, `AbortSignal` e retry com backoff
- Rate limiting local de 120 requisições por minuto
- Erros HTTP consistentes e sem uso de `any`
- Zero dependências em runtime

## Início rápido

```ts
import { DataJudClient, QueryBuilder } from '@lorenzoalberto-dev/datajud-sdk';

const client = new DataJudClient({
  apiKey: process.env.DATAJUD_API_KEY!,
});

const query = new QueryBuilder()
  .classe(1116)
  .orgaoJulgador(13597)
  .intervaloDatas('2024-01-01', '2024-12-31')
  .build();

const response = await client.search('TJDFT', {
  query,
  source: ['numeroProcesso', 'classe', 'orgaoJulgador'],
  size: 100,
});

for (const hit of response.hits.hits) {
  console.log(hit._source.numeroProcesso);
}
```

O primeiro argumento de `search()` é o alias publicado pelo CNJ, como `TJSP`, `TRF1`, `TRT15`, `TRE-SP` ou `STJ`.

## Paginação

Percorra resultados com `search_after` sem gerenciar o cursor manualmente:

```ts
const query = new QueryBuilder().intervaloDatas('2024-01-01', '2024-12-31').build();

for await (const processo of client.iterate('TJSP', {
  query,
  source: ['numeroProcesso', '@timestamp'],
  pageSize: 500,
})) {
  console.log(processo.numeroProcesso);
}
```

## Consulta por número CNJ

`ProcessosService` valida o número, identifica o tribunal e executa a pesquisa:

```ts
import { DataJudClient, ProcessosService } from '@lorenzoalberto-dev/datajud-sdk';

const client = new DataJudClient({
  apiKey: process.env.DATAJUD_API_KEY!,
});

const processos = new ProcessosService(client);
const response = await processos.porNumero('0000832-35.2018.4.01.3202');
```

Os helpers também podem ser usados isoladamente:

```ts
import { isValidNumeroProcesso, parseNumeroProcesso } from '@lorenzoalberto-dev/datajud-sdk';

isValidNumeroProcesso('0000832-35.2018.4.01.3202'); // true
parseNumeroProcesso('0000832-35.2018.4.01.3202').alias; // TRF1
```

## Configuração

```ts
const client = new DataJudClient({
  apiKey: process.env.DATAJUD_API_KEY!,
  timeout: 30_000,
  retries: 3,
  retryDelay: 250,
  logger: console,
});
```

| Opção        |      Padrão | Finalidade                               |
| ------------ | ----------: | ---------------------------------------- |
| `apiKey`     | obrigatória | Chave usada no cabeçalho `Authorization` |
| `timeout`    |     `30000` | Tempo máximo de cada tentativa, em ms    |
| `retries`    |         `3` | Número máximo de novas tentativas        |
| `retryDelay` |       `250` | Intervalo-base do backoff, em ms         |
| `rateLimit`  |     120 rpm | Limite local por instância do cliente    |
| `cache`      |           — | Implementação opcional de cache          |
| `logger`     |           — | Interface simples para logs              |
| `fetch`      |      global | Implementação alternativa de `fetch`     |

A chave da API é pública, mas pode ser alterada pelo CNJ. Consulte a [página oficial de acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso/) e mantenha seu valor configurável.

## Tratamento de erros

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
    console.error('A chave foi recusada pelo DataJud.');
  } else if (error instanceof RateLimitError) {
    console.error('O limite de requisições foi excedido.');
  } else if (error instanceof ValidationError) {
    console.error(error.message);
  } else if (error instanceof DataJudError) {
    console.error(error.status, error.body);
  }
}
```

## Documentação

- [Guia completo e referência da API](docs/sdk.md)
- [Guia do explorador web](docs/frontend.md)
- [Runbook operacional](RUNBOOK.md)
- [Endpoints oficiais do DataJud](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/)
- [Glossário oficial de campos](https://datajud-wiki.cnj.jus.br/api-publica/glossario/)

## Desenvolvimento

```bash
git clone https://github.com/lorenzoalberto/datajud-sdk.git
cd datajud-sdk
npm install
npm run check
npm run smoke:package
```

O repositório também inclui um explorador web local:

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Para publicá-lo na Vercel, use `frontend` como Root Directory e configure `DATAJUD_API_KEY` nas variáveis de ambiente do projeto. Consulte o [guia do explorador](docs/frontend.md#deploy-na-vercel).

## Escopo

O SDK utiliza exclusivamente o endpoint público de pesquisa:

```text
POST /api_publica_{alias}/_search
```

O projeto mantém um único pacote e prioriza uma API pública pequena e confiável. Plugins, múltiplos pacotes, inferência avançada de `_source` e infraestrutura excessiva permanecem fora do escopo até existir demanda concreta.

## Licença

Distribuído sob a [Licença MIT](LICENSE).
