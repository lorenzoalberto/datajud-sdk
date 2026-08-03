import { spawn } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const readBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const value: unknown = chunk;
    if (typeof value === 'string' || value instanceof Uint8Array) chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
};

/**
 * O DNS do Node pode falhar com EAI_AGAIN em alguns ambientes, mesmo quando
 * curl funciona. Este middleware mantém a chamada same-origin no navegador e
 * delega somente o transporte ao curl, sem shell e com rota estritamente validada.
 */
const dataJudCurlProxy = (): Plugin => ({
  name: 'datajud-curl-proxy',
  configureServer(server) {
    server.middlewares.use('/datajud-api', (request, response, next) => {
      void handleDataJudRequest(request, response, next).catch((error: unknown) => {
        response.statusCode = 502;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(
          JSON.stringify({
            error: 'Falha no proxy local do DataJud.',
            detail: error instanceof Error ? error.message : 'Erro desconhecido.',
          }),
        );
      });
    });
  },
});

async function handleDataJudRequest(
  request: IncomingMessage,
  response: ServerResponse,
  next: (error?: unknown) => void,
): Promise<void> {
  if (request.method !== 'POST') {
    next();
    return;
  }
  const path = request.url?.split('?')[0] ?? '';
  if (!/^\/api_publica_[a-z0-9-]+\/_search$/.test(path)) {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: 'Rota DataJud inválida.' }));
    return;
  }
  const authorization = request.headers.authorization;
  if (!authorization) {
    response.statusCode = 401;
    response.end(JSON.stringify({ error: 'Cabeçalho Authorization ausente.' }));
    return;
  }
  const body = await readBody(request);
  const url = `https://api-publica.datajud.cnj.jus.br${path}`;
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
    url,
  ];
  const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  const output = Buffer.concat(stdout).toString('utf8');
  const separator = output.lastIndexOf('\n');
  const responseBody = separator >= 0 ? output.slice(0, separator) : output;
  const status = separator >= 0 ? Number(output.slice(separator + 1)) : 502;
  response.statusCode = Number.isInteger(status) && status >= 100 ? status : 502;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (exitCode !== 0 && !responseBody) {
    response.end(
      JSON.stringify({
        error: 'curl não conseguiu acessar o DataJud.',
        detail: Buffer.concat(stderr).toString('utf8').trim(),
        exitCode,
      }),
    );
    return;
  }
  response.end(responseBody);
}

export default defineConfig({
  plugins: [react(), dataJudCurlProxy()],
  resolve: {
    alias: {
      '@lorenzoalberto-dev/datajud-sdk': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
