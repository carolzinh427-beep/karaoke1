import fs from 'fs';
import path from 'path';

console.log('\n======================================================');
console.log(' VALIDANDO SITEMAP.XML E ROBOTS.TXT (BACKSTAGE)');
console.log('======================================================\n');

const EXPECTED_DOMAIN = 'https://www.backstagekaraoke.com.br';

function testSitemapAndRobots() {
  const publicSitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  const rootSitemapPath = path.join(process.cwd(), 'sitemap.xml');
  const publicRobotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  const rootRobotsPath = path.join(process.cwd(), 'robots.txt');

  // 1. Arquivos existem
  if (!fs.existsSync(publicSitemapPath)) throw new Error('public/sitemap.xml não encontrado.');
  if (!fs.existsSync(rootSitemapPath)) throw new Error('sitemap.xml na raiz não encontrado.');
  if (!fs.existsSync(publicRobotsPath)) throw new Error('public/robots.txt não encontrado.');
  if (!fs.existsSync(rootRobotsPath)) throw new Error('robots.txt na raiz não encontrado.');
  console.log('  ✓ [PASSOU] 1. Arquivos sitemap.xml e robots.txt existem na raiz e na pasta public/');

  const sitemapXml = fs.readFileSync(publicSitemapPath, 'utf8');
  const robotsTxt = fs.readFileSync(publicRobotsPath, 'utf8');

  // 2. Estrutura e sintaxe XML
  if (!sitemapXml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    throw new Error('Cabeçalho XML <?xml version="1.0" encoding="UTF-8"?> inválido.');
  }
  if (!sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') || !sitemapXml.includes('</urlset>')) {
    throw new Error('Tags de abertura/fechamento <urlset> ausentes ou namespace inválido.');
  }
  console.log('  ✓ [PASSOU] 2. Cabeçalho XML e namespace oficial sitemaps.org validados');

  // 3. URLs Canônicas e Domínio
  const locMatches = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  if (locMatches.length < 3) {
    throw new Error(`Esperado no mínimo 3 URLs públicas, encontrado ${locMatches.length}`);
  }

  for (const loc of locMatches) {
    if (!loc.startsWith(EXPECTED_DOMAIN)) {
      throw new Error(`URL não utiliza o domínio oficial ${EXPECTED_DOMAIN}: ${loc}`);
    }
    // Proibir páginas administrativas, login, checkout ou privadas
    const forbidden = ['/admin', '/api', 'checkout', 'login', 'token', 'secret', 'painel'];
    for (const f of forbidden) {
      if (loc.toLowerCase().includes(f)) {
        throw new Error(`URL proibida encontrada no sitemap: ${loc}`);
      }
    }
  }
  console.log(`  ✓ [PASSOU] 3. Todas as ${locMatches.length} URLs pertencem a ${EXPECTED_DOMAIN} sem áreas restritas`);

  // 4. Checar URLs esperadas
  const requiredUrls = [
    `${EXPECTED_DOMAIN}/`,
    `${EXPECTED_DOMAIN}/salas`,
    `${EXPECTED_DOMAIN}/cardapio`
  ];
  for (const req of requiredUrls) {
    if (!locMatches.includes(req)) {
      throw new Error(`URL pública obrigatória ausente no sitemap: ${req}`);
    }
  }
  console.log('  ✓ [PASSOU] 4. Páginas públicas essenciais (Home, Salas, Cardápio) incluídas');

  // 5. Validação de robots.txt
  if (!robotsTxt.includes('User-agent: *')) throw new Error('robots.txt não declara User-agent: *');
  if (!robotsTxt.includes('Allow: /')) throw new Error('robots.txt não permite indexação pública Allow: /');
  if (!robotsTxt.includes('Disallow: /admin/')) throw new Error('robots.txt não bloqueia /admin/');
  if (!robotsTxt.includes('Disallow: /api/')) throw new Error('robots.txt não bloqueia /api/');
  if (!robotsTxt.includes(`Sitemap: ${EXPECTED_DOMAIN}/sitemap.xml`)) {
    throw new Error(`robots.txt não aponta para ${EXPECTED_DOMAIN}/sitemap.xml`);
  }
  console.log('  ✓ [PASSOU] 5. robots.txt protege /admin/ e /api/ e referencia o sitemap oficial');

  console.log('\n======================================================');
  console.log(' RESULTADO: SITEMAP E ROBOTS.TXT 100% VÁLIDOS!');
  console.log('======================================================\n');
}

try {
  testSitemapAndRobots();
  process.exit(0);
} catch (err) {
  console.error('\n❌ ERRO NA VALIDAÇÃO DO SITEMAP:', err.message);
  process.exit(1);
}
