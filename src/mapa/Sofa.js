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
  const { id, x, y, width, height, orientation } = sofa;

  switch (orientation) {
    case 'lounge_l':
      return renderLoungeLSofa(id, x, y, width, height);
    case 'u_shape':
      return renderUShapeSofa(id, x, y, width, height);
    case 'vertical':
    default:
      return renderVerticalSofa(id, x, y, width, height);
  }
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
 * Sofá envolvente na área inferior (ao redor da Mesa 8)
 */
function renderUShapeSofa(id, x, y, width, height) {
  return `
    <g class="map-element map-sofa" id="${id}">
      <!-- Encosto em formato L / U em volta da mesa 8 -->
      <path d="M ${x + width},${y + height} L ${x},${y + height} L ${x},${y} L ${x + 40},${y} L ${x + 40},${y + height - 38} L ${x + width},${y + height - 38} Z" 
            fill="#0A1020" 
            stroke="rgba(0, 240, 255, 0.3)" 
            stroke-width="1.4" />

      <!-- Almofadas do sofá envolvente -->
      <rect x="${x + 6}" y="${y + 8}" width="28" height="38" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 6}" y="${y + 50}" width="28" height="44" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 48}" y="${y + height - 32}" width="48" height="26" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 102}" y="${y + height - 32}" width="54" height="26" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <rect x="${x + 162}" y="${y + height - 32}" width="58" height="26" rx="4" fill="#0F172E" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

      <!-- Rótulo SOFÁ -->
      <text x="${x + 130}" y="${y + height - 14}" text-anchor="middle" class="map-label-sofa">SOFÁ</text>
    </g>
  `;
}
