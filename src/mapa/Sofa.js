/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DE SOFÁS (SOFA)
 * ==============================================================================
 * Renderiza os sofás estofados do salão (paredes laterais, cantos e lounges VIP).
 * Vistos de cima com costuras estofadas, encosto e iluminação de fundo (wall wash).
 */

export function renderSofas(sofasList) {
  return sofasList.map(sofa => renderSingleSofa(sofa)).join('');
}

function renderSingleSofa(sofa) {
  const { id, x, y, width, height, armWidth, armHeight, orientation } = sofa;

  switch (orientation) {
    case 'continuous_l':
      return renderContinuousLSofa(id, x, y, width, height, armWidth || 48, armHeight || 52);
    case 'mesa8_lounge':
    case 'u_shape':
      return renderMesa8LoungeSofa(id, x, y, width, height, armWidth || 42, armHeight || 40);
    case 'lounge_l':
      return renderLoungeLSofa(id, x, y, width, height);
    case 'vertical':
    default:
      return renderVerticalSofa(id, x, y, width, height);
  }
}

/**
 * Sofá contínuo em L no lado esquerdo (não quebrado, sem emendas)
 * Desce desde a lateral do Palco ao longo de toda a parede esquerda e
 * dobra em L contínuo sob a Mesa 1 (30).
 */
function renderContinuousLSofa(id, x, y, width, height, armW, armH) {
  const xLeft = x;
  const xVertRight = x + armW;
  const xHorizRight = x + width;
  const yTop = y;
  const yInner = y + height - armH;
  const yBottom = y + height;

  // Caminho do formato em L suave, contínuo e sem emendas
  const pathD = `
    M ${xLeft + 6},${yTop}
    L ${xVertRight - 6},${yTop}
    Q ${xVertRight},${yTop} ${xVertRight},${yTop + 6}
    L ${xVertRight},${yInner - 6}
    Q ${xVertRight},${yInner} ${xVertRight + 6},${yInner}
    L ${xHorizRight - 6},${yInner}
    Q ${xHorizRight},${yInner} ${xHorizRight},${yInner + 6}
    L ${xHorizRight},${yBottom - 6}
    Q ${xHorizRight},${yBottom} ${xHorizRight - 6},${yBottom}
    L ${xLeft + 6},${yBottom}
    Q ${xLeft},${yBottom} ${xLeft},${yBottom - 6}
    L ${xLeft},${yTop + 6}
    Q ${xLeft},${yTop} ${xLeft + 6},${yTop}
    Z
  `;

  // Almofadas da haste vertical (ao longo da parede esquerda)
  const vertCushionCount = 10;
  const vertStart = yTop + 8;
  const vertAvailableH = (yInner - 8) - vertStart;
  const vertCushionStep = Math.floor(vertAvailableH / vertCushionCount);
  const vertCushionH = vertCushionStep - 4;

  let vertCushions = '';
  for (let i = 0; i < vertCushionCount; i++) {
    const cy = vertStart + i * vertCushionStep;
    vertCushions += `
      <rect x="${xLeft + 10}" y="${cy}" width="${armW - 16}" height="${vertCushionH}" rx="5"
            fill="#0F172E" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
      <line x1="${xLeft + 14}" y1="${cy + 3}" x2="${xLeft + armW - 10}" y2="${cy + 3}" 
            stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-linecap="round" />
    `;
  }

  // Almofada do canto do L
  const cornerCushion = `
    <rect x="${xLeft + 10}" y="${yInner + 6}" width="${armW - 16}" height="${armH - 14}" rx="5"
          fill="#0F172E" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
  `;

  // Almofadas da haste horizontal (sob a Mesa 30)
  const horizStart = xVertRight + 6;
  const horizEnd = xHorizRight - 8;
  const horizAvailableW = horizEnd - horizStart;
  const horizCushionCount = 3;
  const horizCushionStep = Math.floor(horizAvailableW / horizCushionCount);
  const horizCushionW = horizCushionStep - 5;

  let horizCushions = '';
  for (let i = 0; i < horizCushionCount; i++) {
    const cx = horizStart + i * horizCushionStep;
    horizCushions += `
      <rect x="${cx}" y="${yInner + 6}" width="${horizCushionW}" height="${armH - 14}" rx="5"
          fill="#0F172E" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
      <line x1="${cx + 3}" y1="${yInner + 9}" x2="${cx + horizCushionW - 3}" y2="${yInner + 9}" 
            stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-linecap="round" />
    `;
  }

  return `
    <g class="map-element map-sofa" id="${id}">
      <!-- Sombra do sofá contínuo em L -->
      <path d="${pathD}" fill="#03050B" transform="translate(3, 4)" opacity="0.8" />

      <!-- Estrutura / Estofado base contínuo em L -->
      <path d="${pathD}" 
            fill="#0A1020" 
            stroke="rgba(0, 240, 255, 0.3)" 
            stroke-width="1.4" />

      <!-- Faixa de encosto traseiro encostado na parede -->
      <rect x="${xLeft + 2}" y="${yTop + 2}" width="7" height="${height - 4}" rx="3" fill="#050811" />
      <rect x="${xLeft + 2}" y="${yBottom - 8}" width="${width - 4}" height="6" rx="2" fill="#050811" />

      <!-- Almofadas da extensão vertical -->
      ${vertCushions}

      <!-- Almofada do canto -->
      ${cornerCushion}

      <!-- Almofadas da extensão horizontal -->
      ${horizCushions}

      <!-- Linha neon ciano contínua acompanhando o contorno interno -->
      <path d="M ${xVertRight},${yTop + 10} L ${xVertRight},${yInner} L ${xHorizRight - 8},${yInner}" 
            fill="none" 
            stroke="rgba(0, 240, 255, 0.45)" 
            stroke-width="1.8" 
            stroke-linecap="round" 
            stroke-linejoin="round" />

      <!-- Rótulo SOFÁ na extensão vertical -->
      <text x="${xLeft + armW / 2}" y="${yTop + (yInner - yTop) / 2}" 
            text-anchor="middle" 
            transform="rotate(-90 ${xLeft + armW / 2} ${yTop + (yInner - yTop) / 2})" 
            class="map-label-sofa">SOFÁ</text>

      <!-- Rótulo SOFÁ na extensão horizontal sob a mesa -->
      <text x="${xVertRight + horizAvailableW / 2}" y="${yInner + armH / 2 + 4}" 
            text-anchor="middle" 
            class="map-label-sofa">SOFÁ</text>
    </g>
  `;
}

/**
 * Sofá reto vertical encostado nas paredes
 */
function renderVerticalSofa(id, x, y, width, height) {
  const segments = Math.floor(height / 60);

  let cushions = '';
  for (let i = 0; i < segments; i++) {
    const cy = y + 8 + i * (height - 16) / segments;
    const ch = (height - 16) / segments - 4;
    cushions += `
      <rect x="${x + 10}" y="${cy}" width="${width - 16}" height="${ch}" rx="5" 
            fill="#0F172E" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
    `;
  }

  return `
    <g class="map-element map-sofa" id="${id}">
      <!-- Sombra do sofá -->
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#03050B" transform="translate(2, 3)" opacity="0.75" />

      <!-- Base do encosto (mais escuro e encostado na parede) -->
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" 
            fill="#0A1020" 
            stroke="rgba(0, 240, 255, 0.25)" 
            stroke-width="1.2" />

      <!-- Almofadas do assento -->
      ${cushions}

      <!-- Linha neon azul sutil na base -->
      <line x1="${x + width}" y1="${y + 10}" x2="${x + width}" y2="${y + height - 10}" 
            stroke="rgba(0, 240, 255, 0.4)" stroke-width="2" stroke-linecap="round" />

      <!-- Rótulo sutil SOFÁ -->
      <text x="${x + width / 2}" y="${y + height / 2}" 
            text-anchor="middle" 
            transform="rotate(-90 ${x + width / 2} ${y + height / 2})" 
            class="map-label-sofa">SOFÁ</text>
    </g>
  `;
}

/**
 * Sofá em formato de L no canto inferior esquerdo
 */
function renderLoungeLSofa(id, x, y, width, height) {
  return `
    <g class="map-element map-sofa" id="${id}">
      <!-- Sombra -->
      <path d="M ${x},${y} L ${x + width},${y} L ${x + width},${y + 45} L ${x + 50},${y + 45} L ${x + 50},${y + height} L ${x},${y + height} Z" 
            fill="#03050B" transform="translate(3, 4)" opacity="0.8" />

      <!-- Estrutura L -->
      <path d="M ${x},${y} L ${x + width},${y} L ${x + width},${y + 45} L ${x + 50},${y + 45} L ${x + 50},${y + height} L ${x},${y + height} Z" 
            fill="#0A1020" 
            stroke="rgba(168, 85, 247, 0.35)" 
            stroke-width="1.4" />

      <!-- Almofadas horizontais -->
      <rect x="${x + 56}" y="${y + 6}" width="38" height="32" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 98}" y="${y + 6}" width="38" height="32" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 140}" y="${y + 6}" width="42" height="32" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

      <!-- Almofadas verticais -->
      <rect x="${x + 6}" y="${y + 6}" width="38" height="32" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 6}" y="${y + 42}" width="38" height="42" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 6}" y="${y + 88}" width="38" height="44" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

      <!-- Mesinha de apoio de centro redonda no canto do lounge -->
      <circle cx="${x + 115}" cy="${y + 90}" r="16" fill="#151D33" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <circle cx="${x + 115}" cy="${y + 90}" r="4" fill="rgba(0, 240, 255, 0.5)" />

      <!-- Rótulo SOFÁ -->
      <text x="${x + 115}" y="${y + 30}" text-anchor="middle" class="map-label-sofa">SOFÁ</text>
    </g>
  `;
}

/**
 * Sofá envolvente da Mesa 8 / Mesa 14:
 * - Lado maior no lado direito da mesa (haste vertical longa)
 * - Parte menor embaixo (haste horizontal curta)
 * - Virado para o lado esquerdo (encosto no lado direito e fundo, assentos voltados para a mesa)
 */
function renderMesa8LoungeSofa(id, x, y, width, height, armW, armH) {
  const xLeft = x;
  const xRight = x + width;
  const xInnerRight = x + width - armW;
  const yTop = y;
  const yBottom = y + height;
  const yInnerBottom = y + height - armH;

  // Caminho contínuo em L no canto inferior direito
  const pathD = `
    M ${xInnerRight + 6},${yTop}
    L ${xRight - 6},${yTop}
    Q ${xRight},${yTop} ${xRight},${yTop + 6}
    L ${xRight},${yBottom - 6}
    Q ${xRight},${yBottom} ${xRight - 6},${yBottom}
    L ${xLeft + 6},${yBottom}
    Q ${xLeft},${yBottom} ${xLeft},${yBottom - 6}
    L ${xLeft},${yInnerBottom + 6}
    Q ${xLeft},${yInnerBottom} ${xLeft + 6},${yInnerBottom}
    L ${xInnerRight - 6},${yInnerBottom}
    Q ${xInnerRight},${yInnerBottom} ${xInnerRight},${yInnerBottom - 6}
    L ${xInnerRight},${yTop + 6}
    Q ${xInnerRight},${yTop} ${xInnerRight + 6},${yTop}
    Z
  `;

  // Almofadas da haste vertical direita (LADO MAIOR: ~3 almofadas)
  const vertAvailableH = (yInnerBottom - 8) - (yTop + 8);
  const vertCount = 3;
  const vertStep = Math.floor(vertAvailableH / vertCount);
  const vertH = vertStep - 4;

  let vertCushions = '';
  for (let i = 0; i < vertCount; i++) {
    const cy = yTop + 8 + i * vertStep;
    vertCushions += `
      <rect x="${xInnerRight + 6}" y="${cy}" width="${armW - 14}" height="${vertH}" rx="4"
            fill="#0F172E" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
      <line x1="${xInnerRight + 9}" y1="${cy + 3}" x2="${xRight - 10}" y2="${cy + 3}"
            stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-linecap="round" />
    `;
  }

  // Almofada do canto inferior direito
  const cornerCushion = `
    <rect x="${xInnerRight + 6}" y="${yInnerBottom + 6}" width="${armW - 14}" height="${armH - 12}" rx="4"
          fill="#0F172E" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
  `;

  // Almofadas da haste horizontal inferior (PARTE MENOR: 2 almofadas)
  const horizAvailableW = (xInnerRight - 8) - (xLeft + 8);
  const horizCount = 2;
  const horizStep = Math.floor(horizAvailableW / horizCount);
  const horizW = horizStep - 5;

  let horizCushions = '';
  for (let i = 0; i < horizCount; i++) {
    const cx = xLeft + 8 + i * horizStep;
    horizCushions += `
      <rect x="${cx}" y="${yInnerBottom + 6}" width="${horizW}" height="${armH - 12}" rx="4"
            fill="#0F172E" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
      <line x1="${cx + 3}" y1="${yInnerBottom + 9}" x2="${cx + horizW - 3}" y2="${yInnerBottom + 9}"
            stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-linecap="round" />
    `;
  }

  return `
    <g class="map-element map-sofa" id="${id}">
      <!-- Sombra -->
      <path d="${pathD}" fill="#03050B" transform="translate(3, 4)" opacity="0.8" />

      <!-- Estrutura base estofada -->
      <path d="${pathD}" 
            fill="#0A1020" 
            stroke="rgba(0, 240, 255, 0.3)" 
            stroke-width="1.4" />

      <!-- Encosto traseiro: lado direito (virado para fora/Mesa 12) -->
      <rect x="${xRight - 7}" y="${yTop + 2}" width="5" height="${height - 4}" rx="2" fill="#050811" />
      <!-- Encosto traseiro: parte inferior (virado para baixo) -->
      <rect x="${xLeft + 2}" y="${yBottom - 7}" width="${width - 4}" height="5" rx="2" fill="#050811" />

      <!-- Almofadas verticais do lado direito (LADO MAIOR) -->
      ${vertCushions}

      <!-- Almofada do canto -->
      ${cornerCushion}

      <!-- Almofadas horizontais da parte de baixo (PARTE MENOR) -->
      ${horizCushions}

      <!-- Linha neon ciano no contorno interno (virada para a mesa/lado esquerdo) -->
      <path d="M ${xInnerRight},${yTop + 8} L ${xInnerRight},${yInnerBottom} L ${xLeft + 8},${yInnerBottom}" 
            fill="none" 
            stroke="rgba(0, 240, 255, 0.45)" 
            stroke-width="1.8" 
            stroke-linecap="round" 
            stroke-linejoin="round" />

      <!-- Rótulo SOFÁ na parte de baixo -->
      <text x="${xLeft + horizAvailableW / 2 + 6}" y="${yInnerBottom + armH / 2 + 4}" 
            text-anchor="middle" 
            class="map-label-sofa">SOFÁ</text>

      <!-- Rótulo SOFÁ na extensão vertical direita -->
      <text x="${xInnerRight + armW / 2}" y="${yTop + vertAvailableH / 2 + 8}" 
            text-anchor="middle" 
            transform="rotate(-90 ${xInnerRight + armW / 2} ${yTop + vertAvailableH / 2 + 8})" 
            class="map-label-sofa">SOFÁ</text>
    </g>
  `;
}
