import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('public/assets/brand/favicon.svg');
const publicDir = path.resolve('public');
const brandDir = path.resolve('public/assets/brand');

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon-144x144.png', size: 144 },
    { name: 'favicon-192x192.png', size: 192 },
    { name: 'favicon-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 }
  ];

  const pngBuffers = {};

  for (const item of sizes) {
    const buf = await sharp(svgBuffer, { density: 300 })
      .resize(item.size, item.size)
      .png()
      .toBuffer();
    pngBuffers[item.size] = buf;
    // Salva na pasta brand
    fs.writeFileSync(path.join(brandDir, item.name), buf);
  }

  // Também copia os essenciais para a raiz de public (para compatibilidade total com Googlebot e navegadores)
  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), pngBuffers[48]);
  fs.writeFileSync(path.join(publicDir, 'favicon-96x96.png'), pngBuffers[96]);
  fs.writeFileSync(path.join(publicDir, 'favicon-192x192.png'), pngBuffers[192]);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffers[180]);

  // Cria favicon.ico com 16x16, 32x32 e 48x48
  const icoSizes = [16, 32, 48];
  const count = icoSizes.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + count * dirEntrySize;

  let offset = totalHeaderSize;
  const entries = [];
  const imageBuffers = [];

  for (const s of icoSizes) {
    const buf = pngBuffers[s];
    imageBuffers.push(buf);
    entries.push({
      width: s >= 256 ? 0 : s,
      height: s >= 256 ? 0 : s,
      colors: 0,
      reserved: 0,
      planes: 1,
      bpp: 32,
      size: buf.length,
      offset: offset
    });
    offset += buf.length;
  }

  const icoBuffer = Buffer.alloc(offset);
  // Header
  icoBuffer.writeUInt16LE(0, 0); // reserved
  icoBuffer.writeUInt16LE(1, 2); // ICO type
  icoBuffer.writeUInt16LE(count, 4); // number of images

  // Directory entries
  let entryPos = 6;
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, entryPos + 0);
    icoBuffer.writeUInt8(entry.height, entryPos + 1);
    icoBuffer.writeUInt8(entry.colors, entryPos + 2);
    icoBuffer.writeUInt8(entry.reserved, entryPos + 3);
    icoBuffer.writeUInt16LE(entry.planes, entryPos + 4);
    icoBuffer.writeUInt16LE(entry.bpp, entryPos + 6);
    icoBuffer.writeUInt32LE(entry.size, entryPos + 8);
    icoBuffer.writeUInt32LE(entry.offset, entryPos + 12);
    entryPos += 16;
  }

  // Image data
  for (let i = 0; i < count; i++) {
    imageBuffers[i].copy(icoBuffer, entries[i].offset);
  }

  // Escreve favicon.ico na raiz e na pasta brand
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(brandDir, 'favicon.ico'), icoBuffer);

  // Também copia favicon.svg para a raiz de public
  fs.copyFileSync(svgPath, path.join(publicDir, 'favicon.svg'));

  console.log('✅ Favicons gerados com sucesso!');
  console.log('- public/favicon.ico');
  console.log('- public/favicon.svg');
  console.log('- public/favicon-48x48.png (Tamanho padrão exigido pelo Google Search)');
  console.log('- public/favicon-96x96.png');
  console.log('- public/favicon-192x192.png');
  console.log('- public/apple-touch-icon.png');
  console.log('- public/assets/brand/favicon.ico');
  console.log('- public/assets/brand/favicon-*.png');
}

generate().catch(err => {
  console.error('Erro ao gerar favicons:', err);
  process.exit(1);
});
