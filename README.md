# DataJud SDK

SDK TypeScript para integração com a [API Pública do DataJud](https://datajud-wiki.cnj.jus.br/api-publica/), mantida pelo Conselho Nacional de Justiça (CNJ).

O pacote oferece uma interface tipada para construir consultas, pesquisar metadados de processos públicos e percorrer grandes conjuntos de resultados.

> Projeto independente, sem vínculo oficial com o CNJ. A API Pública do DataJud está sujeita a alterações.

## Visão geral

O repositório reúne dois componentes:

- `@datajud/sdk`: biblioteca TypeScript responsável pela integração, tipagem, validação e controle das consultas;
- `frontend/`: aplicação React/Vite para explorar localmente os recursos do SDK.

## Recursos

- Cliente HTTP baseado no `fetch` nativo do Node.js
- Modelos tipados para processos, consultas e respostas
- Construtor de consultas compatível com a Query DSL utilizada pelo DataJud
- Resolução do tribunal a partir do número processual CNJ
- Paginação contínua com `search_after`
- Timeout, cancelamento e novas tentativas com backoff exponencial
- Limitação local da taxa de requisições
- Cache em memória ou implementação personalizada
- Logger e interceptores de resposta opcionais
- Erros específicos para validação, autenticação, timeout e respostas HTTP

## Requisitos

- Node.js 20 ou superior
- Chave vigente da API Pública do DataJud

A chave é pública, mas pode ser alterada pelo CNJ. Consulte sempre a [página oficial de acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso/) e não grave seu valor no código-fonte.

## Instalação local

```bash
npm install
npm run build
```

A compilação é gerada em `dist/`, com módulos ECMAScript e declarações TypeScript.

## Início rápido

```ts
import { DataJudClient, QueryBuilder } from '@datajud/sdk';

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

## Explorador web

O projeto inclui uma aplicação local para consultar processos por número, tribunal, classe, assunto, órgão julgador, movimentação e período.

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Depois da inicialização, acesse:

```text
http://127.0.0.1:5190
```

O servidor local compila a interface, entrega os arquivos estáticos e encaminha as consultas ao endpoint oficial do DataJud. A chave fica no arquivo local `frontend/.env`, ignorado pelo Git.

Consulte o [guia do frontend](docs/frontend.md) para configuração, comandos e solução de problemas.

## Documentação

- [Guia e referência do SDK](docs/sdk.md)
- [Guia do explorador web](docs/frontend.md)
- [Runbook operacional](RUNBOOK.md)
- [Licença MIT](LICENSE)

## Estrutura

```text
.
├── src/           Código-fonte do SDK
├── frontend/      Aplicação web de demonstração
├── docs/          Guias de uso e referência
├── RUNBOOK.md     Procedimentos operacionais
└── README.md      Visão geral e início rápido
```

## Escopo da API Pública

O DataJud disponibiliza metadados de processos públicos. Dados de partes e processos sigilosos não são fornecidos. Este SDK utiliza exclusivamente o endpoint público de pesquisa:

```text
POST /api_publica_{alias}/_search
```

## Referências oficiais

- [Acesso à API](https://datajud-wiki.cnj.jus.br/api-publica/acesso/)
- [Endpoints disponíveis](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/)
- [Exemplos de consulta](https://datajud-wiki.cnj.jus.br/api-publica/exemplos/)
- [Glossário de campos](https://datajud-wiki.cnj.jus.br/api-publica/glossario/)
- [Termo de uso](https://datajud-wiki.cnj.jus.br/api-publica/termo_de_uso/)

## Licença

Distribuído sob a [Licença MIT](LICENSE).
