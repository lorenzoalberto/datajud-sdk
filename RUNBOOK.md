# Runbook do DataJud SDK

Este documento reúne procedimentos para preparar, compilar e diagnosticar o SDK em ambiente local.

## Pré-requisitos

- Node.js 20 ou superior
- npm
- Acesso HTTPS a `api-publica.datajud.cnj.jus.br`
- Chave vigente da API Pública do DataJud

Confirme as versões locais:

```bash
node --version
npm --version
```

## Preparação do ambiente

Instale as dependências declaradas no lockfile:

```bash
npm install
```

Defina a chave apenas no ambiente da sessão:

```bash
export DATAJUD_API_KEY="sua-chave-vigente"
```

Não registre a chave em arquivos versionados ou em mensagens de log.

## Compilação

Execute:

```bash
npm run build
```

Resultado esperado:

- encerramento com código `0`;
- JavaScript ESM em `dist/`;
- declarações TypeScript em `dist/`;
- ausência de erros do compilador.

O diretório `dist/` é gerado localmente e não deve ser versionado.

## Análise estática e formatação

Para verificar o código:

```bash
npm run lint
```

Para aplicar a formatação configurada no projeto:

```bash
npm run format
```

Revise o diff após qualquer formatação:

```bash
git diff --check
git diff
```

## Verificação manual de conectividade

Use uma consulta pequena e um alias publicado pelo CNJ. Nunca inclua a chave diretamente no histórico do shell.

```bash
curl \
  --request POST \
  --header "Authorization: APIKey ${DATAJUD_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{"size":1,"query":{"match_all":{}}}' \
  "https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search"
```

Uma resposta HTTP bem-sucedida deve conter os campos `took`, `_shards` e `hits`.

## Diagnóstico

### Falha de autenticação

Sintomas:

- HTTP 401 ou 403;
- `AuthenticationError`.

Ações:

1. Consulte a [chave vigente](https://datajud-wiki.cnj.jus.br/api-publica/acesso/).
2. Verifique se a variável `DATAJUD_API_KEY` está definida.
3. Informe somente o valor da chave; o SDK adiciona o prefixo `APIKey`.
4. Confirme que não existem espaços ou quebras de linha no valor.

### Alias de tribunal inválido

Sintomas:

- `ValidationError`;
- mensagem indicando alias não suportado.

Ações:

1. Consulte `TRIBUNAL_ALIASES`.
2. Compare o alias com a [lista oficial de endpoints](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/).
3. Não construa endpoints para órgãos que não estejam publicados.

### Timeout ou indisponibilidade

Sintomas:

- `TimeoutError`;
- HTTP 408 ou 5xx;
- interrupção da conexão.

Ações:

1. Confirme o acesso ao domínio oficial.
2. Repita uma consulta pequena.
3. Reduza `size` e a complexidade da consulta.
4. Ajuste `timeout`, `retries` e `retryDelay` de forma controlada.
5. Verifique a página oficial antes de atribuir a falha ao SDK.

### Limite de requisições

Sintomas:

- HTTP 429;
- `RateLimitError`.

Ações:

1. Reduza a concorrência.
2. Confirme que o limite padrão de 120 rpm não foi desativado ou sobrescrito.
3. Se necessário, configure um `rateLimit` mais conservador no cliente.
4. Utilize cache quando várias chamadas repetirem a mesma consulta.

### Resposta sem cursor de paginação

Sintoma:

- erro informando que a resposta não incluiu `sort`.

Ações:

1. Confirme que a consulta utiliza campos válidos em `sort`.
2. Não remova da resposta os dados necessários ao `search_after`.
3. Execute uma página isolada com `search()` e inspecione `hits.hits[].sort`.

### Número CNJ sem endpoint resolvido

Sintoma:

- `ProcessosService.porNumero()` informa que não foi possível resolver um endpoint público.

Ações:

1. Confirme se o número tem 20 dígitos.
2. Valide o dígito verificador.
3. Inspecione o resultado de `parseNumeroProcesso()`.
4. Confirme se o segmento e o tribunal possuem endpoint público.

## Atualização da chave

Quando o CNJ alterar a chave:

1. Obtenha o novo valor na documentação oficial.
2. Atualize o gerenciador de segredos ou a variável do ambiente consumidor.
3. Reinicie o processo que utiliza o SDK.
4. Faça uma consulta de baixa cardinalidade.
5. Confirme a ausência de erros de autenticação.

Nenhuma alteração no código-fonte ou nova compilação deve ser necessária.

## Preparação de uma versão

Antes de preparar um pacote:

1. Confirme a versão e os metadados em `package.json`.
2. Execute `npm install`.
3. Execute `npm run lint`.
4. Execute `npm run build`.
5. Execute o smoke test do pacote:

```bash
npm run smoke:package
```

O comando empacota o projeto, instala o tarball em um diretório temporário e importa suas principais exportações. O pacote deve conter os artefatos de `dist/`, o `README.md` e a licença.

## Referências

- [Documentação do SDK](docs/sdk.md)
- [Acesso à API Pública](https://datajud-wiki.cnj.jus.br/api-publica/acesso/)
- [Endpoints oficiais](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/)
- [Glossário do DataJud](https://datajud-wiki.cnj.jus.br/api-publica/glossario/)
