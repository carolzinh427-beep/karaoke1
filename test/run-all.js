/**
 * Runner principal unificado de todos os testes automatizados
 */
import { spawnSync } from 'node:child_process';

const testFiles = [
  'test/pricing-and-security.test.js',
  'test/admin-configuracoes.test.js',
  'test/admin-cardapio.test.js',
  'test/table-reservation-flow.test.js',
  'test/private-room-flow.test.js',
  'test/manual-pix-whatsapp-flow.test.js',
  'test/supabase-integration.test.js',
  'test/sitemap-validation.test.js'
];

let allPassed = true;

for (const file of testFiles) {
  console.log(`\n>>> Executando: ${file}`);
  const result = spawnSync('node', [file], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`Falha no teste: ${file} (código ${result.status})`);
    allPassed = false;
    process.exit(result.status || 1);
  }
}

console.log('\n======================================================');
console.log(' TODOS OS ARQUIVOS DE TESTE EXECUTADOS COM SUCESSO!');
console.log('======================================================\n');
