/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DO BAR
 * ==============================================================================
 * Renderiza o balcão do bar no canto lateral direito com iluminação neon ciano,
 * expositor de garrafas com brilho e banquetas alinhadas.
 */

export function renderBar(barData) {
  const { x, y, width, height, neonColor } = barData;

  return `
    <!-- BAR PRINCIPAL -->
    <g class="map-element map-bar-group" id="mapBar" transform="translate(${x}, ${y})">
      <!-- Sombra do balcão -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#04060E" transform="translate(3, 4)" opacity="0.8" />

      <!-- Balcão de alvenaria e mármore negro -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" 
            fill="#090E1F" 
            stroke="rgba(0, 240, 255, 0.35)" 
            stroke-width="1.8" />

      <!-- Prateleira de bebidas interna / iluminação de fundo -->
      <rect x="6" y="10" width="${width - 12}" height="${height - 20}" rx="5" 
            fill="#050812" 
            stroke="rgba(255, 255, 255, 0.06)" 
            stroke-width="1" />

      <!-- Linhas de garrafas iluminadas estilizadas -->
      <g opacity="0.75">
        <line x1="15" y1="30" x2="${width - 15}" y2="30" stroke="rgba(234, 179, 8, 0.5)" stroke-width="3" stroke-dasharray="4,3" />
        <line x1="15" y1="60" x2="${width - 15}" y2="60" stroke="rgba(168, 85, 247, 0.5)" stroke-width="3" stroke-dasharray="4,3" />
        <line x1="15" y1="120" x2="${width - 15}" y2="120" stroke="rgba(0, 240, 255, 0.5)" stroke-width="3" stroke-dasharray="4,3" />
        <line x1="15" y1="180" x2="${width - 15}" y2="180" stroke="rgba(239, 68, 68, 0.5)" stroke-width="3" stroke-dasharray="4,3" />
        <line x1="15" y1="240" x2="${width - 15}" y2="240" stroke="rgba(16, 185, 129, 0.5)" stroke-width="3" stroke-dasharray="4,3" />
      </g>

      <!-- Fita de LED Neon Ciano na borda de atendimento -->
      <line x1="2" y1="6" x2="2" y2="${height - 6}" 
            stroke="${neonColor}" 
            stroke-width="3.5" 
            stroke-linecap="round"
            filter="url(#neonGlowCyan)" />

      <!-- Rótulo BAR vertical -->
      <g transform="translate(${width / 2}, ${height / 2})">
        <text x="0" y="-30" text-anchor="middle" class="map-label-bar-letter">B</text>
        <text x="0" y="0" text-anchor="middle" class="map-label-bar-letter">A</text>
        <text x="0" y="30" text-anchor="middle" class="map-label-bar-letter">R</text>
      </g>

      <!-- Banquetas altas de frente para o bar (lado esquerdo) -->
      <g class="bar-stools" transform="translate(-18, 0)">
        <circle cx="0" cy="40" r="10" fill="#111B38" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.5" />
        <circle cx="0" cy="40" r="4" fill="#00F0FF" opacity="0.6" />

        <circle cx="0" cy="110" r="10" fill="#111B38" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.5" />
        <circle cx="0" cy="110" r="4" fill="#00F0FF" opacity="0.6" />

        <circle cx="0" cy="180" r="10" fill="#111B38" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.5" />
        <circle cx="0" cy="180" r="4" fill="#00F0FF" opacity="0.6" />

        <circle cx="0" cy="250" r="10" fill="#111B38" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.5" />
        <circle cx="0" cy="250" r="4" fill="#00F0FF" opacity="0.6" />
      </g>
    </g>
  `;
}
