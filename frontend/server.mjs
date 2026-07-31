import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = 5190;
const root = fileURLToPath(new URL('./dist', import.meta.url));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const readRequestBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

const sendJson = (response, status, value) => {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const runCurl = async (args) => {
  const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  const output = Buffer.concat(stdout).toString('utf8');
  const separator = output.lastIndexOf('\n');
  return {
    exitCode,
    payload: separator >= 0 ? output.slice(0, separator) : '',
    status: separator >= 0 ? Number(output.slice(separator + 1)) : 502,
    stderr: Buffer.concat(stderr).toString('utf8').trim(),
  };
};

const shouldRetry = (result, exactProcessSearch) => {
  if (result.exitCode !== 0 || [408, 429, 500, 502, 503, 504].includes(result.status)) return true;
  if (result.status !== 200) return false;
  try {
    const parsed = JSON.parse(result.payload);
    const failedShards = Number(parsed?._shards?.failed ?? 0);
    const totalHits = Number(parsed?.hits?.total?.value ?? 0);
    return failedShards > 0 || (exactProcessSearch && totalHits === 0);
  } catch {
    return true;
  }
};

const proxyDataJud = async (request, response) => {
  const startedAt = Date.now();
  const route = request.url?.slice('/api'.length).split('?')[0] ?? '';
  if (request.method !== 'POST' || !/^\/api_publica_[a-z0-9-]+\/_search$/.test(route)) {
    sendJson(response, 400, { error: 'Requisição DataJud inválida.' });
    return;
  }
  const authorization = request.headers.authorization;
  if (!authorization) {
    sendJson(response, 401, { error: 'Cabeçalho Authorization ausente.' });
    return;
  }
  const body = await readRequestBody(request);
  try {
    JSON.parse(body);
  } catch {
    sendJson(response, 400, { error: 'Corpo JSON inválido.' });
    return;
  }
  const exactProcessSearch = body.includes('"numeroProcesso"');
  console.log(`[DataJud] Iniciando ${route}`);
  const args = [
    '--silent',
    '--show-error',
    '--max-time',
    '120',
    '--request',
    'POST',
    '--header',
    `Authorization: ${authorization}`,
    '--header',
    'Content-Type: application/json',
    '--data-binary',
    body,
    '--write-out',
    '\n%{http_code}',
    `https://api-publica.datajud.cnj.jus.br${route}`,
  ];
  let result;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    result = await runCurl(args);
    if (!shouldRetry(result, exactProcessSearch) || attempt === 3) break;
    console.warn(
      `[DataJud] Resposta inconsistente HTTP ${result.status}; repetindo (${attempt}/3).`,
    );
    await wait(attempt * 1_000);
  }
  const { exitCode, payload, status: upstreamStatus, stderr } = result;
  if (exitCode !== 0 || !Number.isInteger(upstreamStatus)) {
    console.error(`[DataJud] curl falhou (exit ${exitCode}): ${stderr}`);
    sendJson(response, 502, {
      error: 'curl não conseguiu acessar o DataJud.',
      detail: stderr,
      exitCode,
    });
    return;
  }
  console.log(`[DataJud] HTTP ${upstreamStatus} em ${Date.now() - startedAt}ms`);
  if (response.destroyed || response.writableEnded) {
    console.warn('[DataJud] O navegador encerrou a conexão antes da resposta.');
    return;
  }
  response.writeHead(upstreamStatus, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(payload);
};

const serveStatic = async (request, response) => {
  const requested =
    request.url === '/' ? '/index.html' : request.url?.split('?')[0] || '/index.html';
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safePath);
  try {
    if (!(await stat(filePath)).isFile()) filePath = join(root, 'index.html');
  } catch {
    filePath = join(root, 'index.html');
  }
  const content = await readFile(filePath);
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': filePath.endsWith('index.html')
      ? 'no-store'
      : 'public, max-age=31536000, immutable',
  });
  response.end(content);
};

const server = createServer((request, response) => {
  response.on('error', (error) => {
    console.error(`[HTTP] Erro ao responder: ${error.message}`);
  });
  const handler = request.url?.startsWith('/api/') ? proxyDataJud : serveStatic;
  void handler(request, response).catch((error) => {
    console.error('[HTTP] Falha na requisição:', error);
    sendJson(response, 500, {
      error: 'Falha no servidor local.',
      detail: error instanceof Error ? error.message : 'Erro desconhecido.',
    });
  });
});

server.on('clientError', (error, socket) => {
  console.error(`[HTTP] Erro do cliente: ${error.message}`);
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

server.on('error', (error) => {
  console.error(`[Servidor] ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`\nFrontend pronto em http://${host}:${port}\n`);
  console.log('Mantenha o terminal aberto enquanto estiver usando a aplicação.');
});
