# DataJud SDK

SDK TypeScript, tipado e independente de frameworks para integração com a [API Pública do DataJud](https://datajud-wiki.cnj.jus.br/api-publica/), mantida pelo Conselho Nacional de Justiça (CNJ).

Construa consultas processuais, valide números CNJ, resolva endpoints de tribunais e percorra grandes conjuntos de resultados sem lidar diretamente com os detalhes da Query DSL e do envelope Elasticsearch.

> Projeto independente, sem vínculo oficial com o CNJ. A API Pública do DataJud está sujeita a alterações.
> Em desenvolvimento.

## Recursos

- Cliente HTTP baseado no `fetch` nativo do Node.js
- Modelos tipados para processos, consultas e respostas
- Construtor de consultas compatível com a Query DSL utilizada pelo DataJud
- Resolução do tribunal a partir do número processual CNJ
- Paginação contínua com `search_after`
- Timeout, cancelamento e novas tentativas com backoff exponencial
- Limitação local padrão de 120 requisições por minuto
- Cache em memória ou implementação personalizada
- Interface simples de logger
- Erros específicos para validação, autenticação, timeout e respostas HTTP

## Conteúdo

- [Requisitos](#requisitos)
- [Instalação local](#instalação-local)
- [Início rápido](#início-rápido)
- [Explorador web](#explorador-web)
- [Qualidade e compilação](#qualidade-e-compilação)
- [Documentação](#documentação)
- [Escopo da API Pública](#escopo-da-api-pública)

## Requisitos

- Node.js 20 ou superior
- Chave vigente da API Pública do DataJud

A chave é pública, mas pode ser alterada pelo CNJ. Consulte sempre a [página oficial de acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso/) e mantenha seu valor configurável no ambiente da aplicação.

## Instalação local

```bash
npm install
npm run build
```

A compilação é gerada em `dist/`, com módulos ECMAScript e declarações TypeScript.

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
  const processo = hit._source;
  console.log(processo.numeroProcesso, processo.classe.nome);
}
```

O primeiro argumento de `search()` é o alias do tribunal publicado pelo CNJ, como `TJSP`, `TRF1`, `TRT15`, `TRE-SP` ou `STJ`.

Para paginação, cache, consultas avançadas e tratamento de erros, consulte o [guia completo do SDK](docs/sdk.md).

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

## Qualidade e compilação

Execute todas as verificações do projeto:

```bash
npm run check
```

O comando realiza análise estática, executa a suíte automatizada e compila o SDK. As verificações cobrem o cliente HTTP, cache, construção de consultas, validação do número processual e resolução de tribunais.

Para validar exatamente os arquivos que seriam publicados:

```bash
npm run smoke:package
```

Esse comando cria o tarball com `npm pack`, instala-o em um diretório temporário e importa a API pública pelo nome do pacote. A integração contínua executa tanto `check` quanto esse smoke test.

Comandos individuais:

| Comando                  | Descrição                      |
| ------------------------ | ------------------------------ |
| `npm run lint`           | Executa a análise estática     |
| `npm test`               | Executa a suíte automatizada   |
| `npm run build`          | Compila o SDK em `dist/`       |
| `npm run format`         | Formata os arquivos do projeto |
| `npm run frontend:build` | Compila o explorador web       |

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
├── tests/         Verificações automatizadas do SDK
├── docs/          Guias de uso e referência
├── RUNBOOK.md     Procedimentos operacionais
└── README.md      Visão geral e início rápido
```

## Escopo da API Pública

O DataJud disponibiliza metadados de processos públicos. Dados de partes e processos sigilosos não são fornecidos. Este SDK utiliza exclusivamente o endpoint público de pesquisa:

```text
POST /api_publica_{alias}/_search
```

O SDK não cria operações de cadastro, atualização ou detalhamento que não sejam oferecidas pela API oficial.

## Referências oficiais

- [Acesso à API](https://datajud-wiki.cnj.jus.br/api-publica/acesso/)
- [Endpoints disponíveis](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/)
- [Exemplos de consulta](https://datajud-wiki.cnj.jus.br/api-publica/exemplos/)
- [Glossário de campos](https://datajud-wiki.cnj.jus.br/api-publica/glossario/)
- [Termo de uso](https://datajud-wiki.cnj.jus.br/api-publica/termo_de_uso/)

## Licença

Distribuído sob a [Licença MIT](LICENSE).
