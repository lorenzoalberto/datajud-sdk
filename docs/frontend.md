# Guia do explorador web

O explorador web é uma aplicação React/Vite incluída em `frontend/` para demonstrar o uso do DataJud SDK em uma interface local.

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
- `curl` disponível no sistema;
- chave vigente da API Pública do DataJud.

## Configuração

Entre no diretório da aplicação e crie o arquivo de ambiente local:

```bash
cd frontend
cp .env.example .env
```

Confira o valor de `VITE_DATAJUD_API_KEY` em `.env` e, se necessário, atualize-o com a chave publicada na [página oficial de acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso/).

O arquivo `.env` é local e não deve ser versionado.

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

| Comando | Descrição |
| --- | --- |
| `npm start` | Compila a aplicação e inicia o servidor local na porta 5190 |
| `npm run dev` | Inicia o servidor visual de desenvolvimento Vite na porta 5180 |
| `npm run build` | Gera os arquivos estáticos em `frontend/dist/` |
| `npm run preview` | Visualiza uma compilação existente sem o encaminhamento integrado |

Na raiz do repositório, também estão disponíveis:

```bash
npm run frontend:dev
npm run frontend:build
```

Use `npm start` para realizar consultas pela interface completa. Os comandos `dev` e `preview` são destinados ao trabalho visual com os arquivos do frontend.

## Funcionamento

A aplicação importa o SDK diretamente de `src/index.ts` durante o desenvolvimento. As consultas são construídas com `QueryBuilder` e enviadas ao endpoint correspondente ao alias selecionado.

O navegador não acessa diretamente o domínio do CNJ. O servidor local:

1. recebe a requisição em uma rota interna;
2. valida o método e o formato do endpoint;
3. encaminha a requisição ao DataJud usando `curl`;
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

### Chave não configurada

Mensagem esperada:

```text
Configure VITE_DATAJUD_API_KEY no arquivo frontend/.env.
```

Confirme a existência do arquivo e reinicie o servidor após alterar a variável.

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

### Falha do `curl`

Verifique se o executável está disponível:

```bash
curl --version
```

Depois, confirme que o ambiente possui acesso HTTPS a:

```text
https://api-publica.datajud.cnj.jus.br
```

## Segurança

- Não versione `frontend/.env`.
- Não exponha a chave em logs, capturas de tela ou relatórios.
- Utilize somente aliases validados pelo SDK.
- Execute o servidor no endereço local configurado pelo projeto.

## Referências

- [Início rápido](../README.md)
- [Documentação do SDK](sdk.md)
- [Acesso à API Pública](https://datajud-wiki.cnj.jus.br/api-publica/acesso/)
- [Endpoints oficiais](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/)
