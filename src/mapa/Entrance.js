/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DA ENTRADA PRINCIPAL (ENTRANCE)
 * ==============================================================================
 * Renderiza o pórtico de entrada na parte inferior com setas direcionais,
 * degraus iluminados e balizadores em neon ciano.
 */

export function renderEntrance(entranceData) {
  const { x, y, width, height, neonColor } = entranceData;

  return `
    <!-- ENTRADA PRINCIPAL -->
    <g class="map-element map-entrance-group" id="mapEntrance" transform="translate(${x}, ${y})">
      <!-- Piso do portal de entrada -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="6" 
            fill="#091024" 
            stroke="rgba(0, 240, 255, 0.4)" 
            stroke-width="1.6" />

      <!-- Fita neon do batente -->
      <line x1="8" y1="2" x2="${width - 8}" y2="2" 
            stroke="${neonColor}" stroke-width="3" filter="url(#neonGlowCyan)" />

      <!-- Balizadores laterais de acesso -->
      <rect x="-14" y="6" width="10" height="38" rx="3" fill="#111B38" stroke="rgba(0,240,255,0.4)" stroke-width="1" />
      <rect x="${width + 4}" y="6" width="10" height="38" rx="3" fill="#111B38" stroke="rgba(0,240,255,0.4)" stroke-width="1" />

      <!-- Seta indicativa para cima (acesso ao salão) -->
      <g transform="translate(${width / 2}, 16)">
        <line x1="0" y1="14" x2="0" y2="-4" stroke="#00F0FF" stroke-width="2.5" stroke-linecap="round" />
        <polyline points="-6,2 0,-5 6,2" fill="none" stroke="#00F0FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </g>

      <!-- Rótulo ENTRADA -->
      <text x="${width / 2}" y="42" text-anchor="middle" class="map-label-entrance">ENTRADA</text>
    </g>
  `;
}
