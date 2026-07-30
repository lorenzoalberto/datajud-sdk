import { DataJudClient, QueryBuilder } from '../index.js';

const client = new DataJudClient({ apiKey: process.env.DATAJUD_API_KEY ?? '' });

const porClasse = await client.search('TJDFT', {
  query: new QueryBuilder().classe(1116).orgaoJulgador(13597).build(),
  source: ['numeroProcesso', 'classe', 'orgaoJulgador'],
  size: 100,
});
console.log(porClasse.hits.total);

const porPeriodo = new QueryBuilder().intervaloDatas('2024-01-01', '2024-12-31').build();
const comMovimento = new QueryBuilder().movimento(26).build();
void porPeriodo;
void comMovimento;

for await (const processo of client.iterate('TJDFT', {
  query: new QueryBuilder().classe(1116).build(),
  source: ['numeroProcesso', '@timestamp'],
  pageSize: 100,
})) {
  console.log(processo.numeroProcesso);
}
