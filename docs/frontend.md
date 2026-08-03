# Guia do explorador web

O explorador web é uma aplicação React/Vite incluída em `frontend/` para demonstrar o uso do DataJud SDK localmente ou em um deploy na Vercel.

## Funcionalidades

- pesquisa por número processual CNJ;
- seleção de tribunal;
- filtros por classe, assunto, órgão julgador e movimentação;
- filtro por período de ajuizamento;
- identificação automática do tribunal pelo número CNJ;
- escolha da quantidade de resultados;
- visualização dos principais metadados do processo;
- exibição da resposta JSON completa.

## Requisitos

- Node.js 20 ou superior;
- npm;
- chave vigente da API Pública do DataJud.

## Configuração

Entre no diretório da aplicação e crie o arquivo de ambiente local:

```bash
cd frontend
cp .env.example .env
```

Confira o valor de `DATAJUD_API_KEY` em `.env` e, se necessário, atualize-o com a chave publicada na [página oficial de acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso/).

O arquivo `.env` é local e não deve ser versionado. A variável não usa o prefixo `VITE_`: ela pertence ao servidor e não deve ser incorporada ao JavaScript enviado ao navegador.

## Inicialização

Instale as dependências:

```bash
npm install
```

Compile a interface e inicie o servidor local:

```bash
npm start
```

A aplicação estará disponível em:

```text
http://127.0.0.1:5190
```

Mantenha o processo em execução enquanto utilizar a interface.

## Comandos

| Comando           | Descrição                                                         |
| ----------------- | ----------------------------------------------------------------- |
| `npm start`       | Compila a aplicação e inicia o servidor local na porta 5190       |
| `npm run dev`     | Inicia apenas o servidor visual Vite na porta 5180                |
| `npm run build`   | Gera os arquivos estáticos em `frontend/dist/`                    |
| `npm run preview` | Visualiza uma compilação existente sem o encaminhamento integrado |

Na raiz do repositório, também estão disponíveis:

```bash
npm run frontend:dev
npm run frontend:build
```

Use `npm start` para realizar consultas pela interface completa. Os comandos `dev` e `preview` são destinados ao trabalho visual com os arquivos do frontend.

## Funcionamento

A aplicação consome `@lorenzoalberto-dev/datajud-sdk`. As consultas são construídas com `QueryBuilder` e enviadas para a rota de mesma origem `/api/search`.

O navegador não recebe a chave e não acessa diretamente o domínio do CNJ. No deploy, uma Vercel Function:

1. recebe a requisição em uma rota interna;
2. valida o método, o tribunal e os limites da consulta;
3. adiciona a chave armazenada no ambiente do servidor;
4. consulta o DataJud por meio do SDK;
5. devolve a resposta JSON ao navegador.

O servidor usado por `npm start` oferece o mesmo contrato local:

1. recebe a requisição em `/api/search`;
2. valida o tribunal e lê `DATAJUD_API_KEY` do ambiente;
3. encaminha a consulta ao DataJud;
4. devolve a resposta JSON ao navegador.

Esse fluxo mantém a aplicação em mesma origem e evita dependência da política CORS do endpoint público.

## Uso

1. Abra `http://127.0.0.1:5190`.
2. Informe pelo menos um filtro.
3. Se utilizar um número CNJ válido, confira o tribunal identificado automaticamente.
4. Selecione a quantidade desejada de resultados.
5. Clique em **Consultar DataJud**.
6. Expanda **Ver JSON completo** para inspecionar o retorno original.

Consultas abertas, sem filtros, são rejeitadas pela interface para reduzir respostas muito amplas e possíveis timeouts.

## Diagnóstico

## Deploy na Vercel

1. Importe o repositório `lorenzoalberto/datajud-sdk` na Vercel.
2. Em **Root Directory**, selecione `frontend`.
3. Mantenha o framework **Vite**. O arquivo `vercel.json` já define o build e o diretório de saída.
4. Em **Environment Variables**, crie `DATAJUD_API_KEY` para os ambientes Production e Preview.
5. Faça o deploy.

Não crie `VITE_DATAJUD_API_KEY`: variáveis com `VITE_` são expostas no bundle do navegador.

Após o deploy, teste uma consulta e confira os logs da Function `api/search`. A Function limita cada página a 100 resultados, rejeita pesquisas sem filtros e usa timeout, retry, erros e limitação local do SDK.

## Diagnóstico

### Chave não configurada

Mensagem esperada:

```text
DATAJUD_API_KEY não configurada no servidor.
```

Localmente, confirme a existência de `frontend/.env` e reinicie o servidor. Na Vercel, confira a variável do ambiente correspondente e faça um novo deploy.

### Servidor local desconectado

Confirme que o terminal iniciado com `npm start` permanece aberto e que a porta 5190 está disponível.

### Falha de autenticação

Consulte a chave vigente na documentação oficial, atualize `frontend/.env` e reinicie a aplicação.

### Consulta sem resultados

Confirme:

- o alias do tribunal;
- a formatação e validade do número CNJ;
- os códigos de classe, assunto, órgão ou movimentação;
- o intervalo de datas;
- a disponibilidade do endpoint oficial.

### Falha de conectividade

Confirme nos logs que o ambiente possui acesso HTTPS a:

```text
https://api-publica.datajud.cnj.jus.br
```

## Segurança

- Não versione `frontend/.env`.
- Mantenha `DATAJUD_API_KEY` somente no ambiente do servidor.
- Nunca use o prefixo `VITE_` para a chave.
- Utilize somente aliases validados pelo SDK.
- Limites em memória são aplicados por instância serverless; configure regras adicionais na Vercel se a demonstração receber tráfego não confiável.

## Referências

- [Início rápido](../README.md)
- [Documentação do SDK](sdk.md)
- [Acesso à API Pública](https://datajud-wiki.cnj.jus.br/api-publica/acesso/)
- [Endpoints oficiais](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/)
