/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DE ILUMINAÇÃO DE PISO (LED FLOOR)
 * ==============================================================================
 * Renderiza as fitas embutidas de LED neon no piso do salão, incluindo
 * a cruz central iluminada que organiza a circulação entre as mesas.
 */

export function renderLEDFloor(ledData) {
  const { horizontal, vertical, neonColor } = ledData;

  return `
    <!-- FITAS DE LED EMBUTIDAS NO PISO -->
    <g class="map-element map-led-floor" id="mapLEDFloor" opacity="0.95">
      <!-- Linhas de brilho difuso (Underglow) -->
      <line x1="${horizontal.x1}" y1="${horizontal.y1 - 6}" x2="${horizontal.x2}" y2="${horizontal.y1 - 6}" 
            stroke="${neonColor}" stroke-width="2.5" opacity="0.8" filter="url(#neonGlowCyan)" />
      <line x1="${horizontal.x1}" y1="${horizontal.y1 + 6}" x2="${horizontal.x2}" y2="${horizontal.y1 + 6}" 
            stroke="${neonColor}" stroke-width="2.5" opacity="0.8" filter="url(#neonGlowCyan)" />

      <line x1="${vertical.x1 - 6}" y1="${vertical.y1}" x2="${vertical.x1 - 6}" y2="${vertical.y2}" 
            stroke="${neonColor}" stroke-width="2.5" opacity="0.8" filter="url(#neonGlowCyan)" />
      <line x1="${vertical.x1 + 6}" y1="${vertical.y1}" x2="${vertical.x1 + 6}" y2="${vertical.y2}" 
            stroke="${neonColor}" stroke-width="2.5" opacity="0.8" filter="url(#neonGlowCyan)" />

      <!-- Linhas centrais de filamento neon branco/ciano brilhante -->
      <line x1="${horizontal.x1}" y1="${horizontal.y1 - 6}" x2="${horizontal.x2}" y2="${horizontal.y1 - 6}" 
            stroke="#E0F7FF" stroke-width="1.2" />
      <line x1="${horizontal.x1}" y1="${horizontal.y1 + 6}" x2="${horizontal.x2}" y2="${horizontal.y1 + 6}" 
            stroke="#E0F7FF" stroke-width="1.2" />

      <line x1="${vertical.x1 - 6}" y1="${vertical.y1}" x2="${vertical.x1 - 6}" y2="${vertical.y2}" 
            stroke="#E0F7FF" stroke-width="1.2" />
      <line x1="${vertical.x1 + 6}" y1="${vertical.y1}" x2="${vertical.x1 + 6}" y2="${vertical.y2}" 
            stroke="#E0F7FF" stroke-width="1.2" />

      <!-- Nó central de cruzamento -->
      <circle cx="${vertical.x1}" cy="${horizontal.y1}" r="14" 
              fill="rgba(0, 240, 255, 0.25)" filter="url(#neonGlowCyan)" />
      <circle cx="${vertical.x1}" cy="${horizontal.y1}" r="6" 
              fill="#E0F7FF" />

      <!-- Texto indicativo LED -->
      <text x="${vertical.x1 + 38}" y="${horizontal.y1 - 18}" class="map-label-led">LED</text>
    </g>
  `;
}
