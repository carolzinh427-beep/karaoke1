/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DE ILUMINAÇÃO DE PISO (LED FLOOR)
 * ==============================================================================
 * Renderiza as fitas embutidas de LED neon no piso do salão (cruz central de circulação).
 * Cores neon vibrantes pedidas:
 * - 1 Fita Rosa (Neon Pink)
 * - 1 Fita Verde (Neon Green)
 * - 1 Fita Azul (Electric Blue)
 * Espessura reforçada (um pouco mais grossa) com brilho de filamento interno.
 */

export function renderLEDFloor(ledData) {
  const cx = 500;
  const cy = 475;

  // Segmentos dos 4 braços da cruz deixando a encruzilhada central livre
  const arms = {
    west:  { x1: 215, x2: 472, y1: cy, y2: cy },
    east:  { x1: 528, x2: 745, y1: cy, y2: cy },
    north: { x1: cx, x2: cx, y1: 290, y2: 446 },
    south: { x1: cx, x2: cx, y1: 504, y2: 660 }
  };

  // As 3 faixas de LED: Rosa, Verde e Azul (mais grossas e brilhantes)
  const tracks = [
    { offset: -10, color: '#FF1E88', glow: 'url(#neonGlowPink)', core: '#FFAAD4', name: 'rosa' },
    { offset: 0,   color: '#00FF7F', glow: 'url(#neonGlowGreen)', core: '#D1FFEB', name: 'verde' },
    { offset: 10,  color: '#00D0FF', glow: 'url(#neonGlowBlue)',  core: '#C9F4FF', name: 'azul' }
  ];

  let horizontalTracksSvg = '';
  tracks.forEach(tr => {
    const yTrack = cy + tr.offset;
    // Braço Oeste
    horizontalTracksSvg += `
      <!-- Faixa ${tr.name} Oeste -->
      <line x1="${arms.west.x1}" y1="${yTrack}" x2="${arms.west.x2}" y2="${yTrack}" 
            stroke="${tr.color}" stroke-width="8" opacity="0.85" filter="${tr.glow}" stroke-linecap="round" />
      <line x1="${arms.west.x1}" y1="${yTrack}" x2="${arms.west.x2}" y2="${yTrack}" 
            stroke="${tr.color}" stroke-width="4.5" stroke-linecap="round" />
      <line x1="${arms.west.x1}" y1="${yTrack}" x2="${arms.west.x2}" y2="${yTrack}" 
            stroke="${tr.core}" stroke-width="1.8" stroke-linecap="round" />
    `;
    // Braço Leste
    horizontalTracksSvg += `
      <!-- Faixa ${tr.name} Leste -->
      <line x1="${arms.east.x1}" y1="${yTrack}" x2="${arms.east.x2}" y2="${yTrack}" 
            stroke="${tr.color}" stroke-width="8" opacity="0.85" filter="${tr.glow}" stroke-linecap="round" />
      <line x1="${arms.east.x1}" y1="${yTrack}" x2="${arms.east.x2}" y2="${yTrack}" 
            stroke="${tr.color}" stroke-width="4.5" stroke-linecap="round" />
      <line x1="${arms.east.x1}" y1="${yTrack}" x2="${arms.east.x2}" y2="${yTrack}" 
            stroke="${tr.core}" stroke-width="1.8" stroke-linecap="round" />
    `;
  });

  let verticalTracksSvg = '';
  tracks.forEach(tr => {
    const xTrack = cx + tr.offset;
    // Braço Norte
    verticalTracksSvg += `
      <!-- Faixa ${tr.name} Norte -->
      <line x1="${xTrack}" y1="${arms.north.y1}" x2="${xTrack}" y2="${arms.north.y2}" 
            stroke="${tr.color}" stroke-width="8" opacity="0.85" filter="${tr.glow}" stroke-linecap="round" />
      <line x1="${xTrack}" y1="${arms.north.y1}" x2="${xTrack}" y2="${arms.north.y2}" 
            stroke="${tr.color}" stroke-width="4.5" stroke-linecap="round" />
      <line x1="${xTrack}" y1="${arms.north.y1}" x2="${xTrack}" y2="${arms.north.y2}" 
            stroke="${tr.core}" stroke-width="1.8" stroke-linecap="round" />
    `;
    // Braço Sul
    verticalTracksSvg += `
      <!-- Faixa ${tr.name} Sul -->
      <line x1="${xTrack}" y1="${arms.south.y1}" x2="${xTrack}" y2="${arms.south.y2}" 
            stroke="${tr.color}" stroke-width="8" opacity="0.85" filter="${tr.glow}" stroke-linecap="round" />
      <line x1="${xTrack}" y1="${arms.south.y1}" x2="${xTrack}" y2="${arms.south.y2}" 
            stroke="${tr.color}" stroke-width="4.5" stroke-linecap="round" />
      <line x1="${xTrack}" y1="${arms.south.y1}" x2="${xTrack}" y2="${arms.south.y2}" 
            stroke="${tr.core}" stroke-width="1.8" stroke-linecap="round" />
    `;
  });

  return `
    <!-- FITAS DE LED EMBUTIDAS NO PISO (ROSA, VERDE, AZUL - ESPESSURA REFORÇADA) -->
    <g class="map-element map-led-floor" id="mapLEDFloor" opacity="0.98">
      <!-- Faixas Horizontais (Rosa / Verde / Azul) -->
      ${horizontalTracksSvg}

      <!-- Faixas Verticais (Rosa / Verde / Azul) -->
      ${verticalTracksSvg}

      <!-- PONTO CENTRAL DE CRUZAMENTO / NEXUS MULTICOLOR -->
      <g class="led-junction-hub" pointer-events="none">
        <!-- Anel Rosa externo -->
        <circle cx="${cx}" cy="${cy}" r="22" 
                fill="none" stroke="#FF1E88" stroke-width="3" opacity="0.9" filter="url(#neonGlowPink)" />
        <!-- Anel Verde intermediário -->
        <circle cx="${cx}" cy="${cy}" r="14" 
                fill="none" stroke="#00FF7F" stroke-width="2.5" opacity="0.95" filter="url(#neonGlowGreen)" />
        <!-- Anel Azul interno -->
        <circle cx="${cx}" cy="${cy}" r="8" 
                fill="none" stroke="#00D0FF" stroke-width="2" opacity="1" filter="url(#neonGlowBlue)" />
        <!-- Centro branco brilhante -->
        <circle cx="${cx}" cy="${cy}" r="4" 
                fill="#FFFFFF" />
      </g>

      <!-- Rótulo indicativo LED -->
      <text x="${cx + 36}" y="${cy - 20}" class="map-label-led">LED</text>
    </g>
  `;
}
