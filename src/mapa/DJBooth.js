/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DA GABINE DO DJ (DJ BOOTH)
 * ==============================================================================
 * Renderiza a cabine de som com mesa de mixagem, toca-discos iluminados,
 * caixas acústicas e iluminação cênica ciano neon.
 */

export function renderDJBooth(djData) {
  const { x, y, width, height, neonColor } = djData;

  return `
    <!-- GABINE DO DJ -->
    <g class="map-element map-dj-group" id="mapDJBooth" transform="translate(${x}, ${y})">
      <!-- Sombra da cabine -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="#04060E" transform="translate(3, 4)" opacity="0.8" />

      <!-- Gabinete / Base -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="10" 
            fill="#0B1124" 
            stroke="rgba(0, 240, 255, 0.35)" 
            stroke-width="1.8" />

      <!-- Moldura interna acústica -->
      <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="6" 
            fill="#060914" 
            stroke="rgba(255, 255, 255, 0.08)" 
            stroke-width="1" />

      <!-- Iluminação Neon superior -->
      <line x1="10" y1="0" x2="${width - 10}" y2="0" 
            stroke="${neonColor}" 
            stroke-width="3" 
            filter="url(#neonGlowCyan)" />

      <!-- Equipamento do DJ: Toca-discos esquerdo -->
      <g transform="translate(32, 70)">
        <circle cx="20" cy="20" r="22" fill="#0E162D" stroke="rgba(0, 240, 255, 0.4)" stroke-width="1.5" />
        <circle cx="20" cy="20" r="16" fill="#070C1A" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />
        <circle cx="20" cy="20" r="6" fill="#00F0FF" opacity="0.85" />
        <line x1="20" y1="2" x2="38" y2="18" stroke="#E2E8F0" stroke-width="1.5" stroke-linecap="round" />
      </g>

      <!-- Mixer Central com faders e LEDs -->
      <g transform="translate(88, 66)">
        <rect x="0" y="0" width="34" height="48" rx="4" fill="#111B38" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" />
        <!-- Faders de volume -->
        <line x1="10" y1="8" x2="10" y2="40" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1.5" />
        <rect x="7" y="20" width="6" height="4" rx="1" fill="#00F0FF" />
        <line x1="24" y1="8" x2="24" y2="40" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1.5" />
        <rect x="21" y="16" width="6" height="4" rx="1" fill="#A855F7" />
        <!-- LEDs de VU meter -->
        <circle cx="10" cy="5" r="1.5" fill="#10B981" />
        <circle cx="24" cy="5" r="1.5" fill="#10B981" />
      </g>

      <!-- Toca-discos direito -->
      <g transform="translate(138, 70)">
        <circle cx="20" cy="20" r="22" fill="#0E162D" stroke="rgba(0, 240, 255, 0.4)" stroke-width="1.5" />
        <circle cx="20" cy="20" r="16" fill="#070C1A" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />
        <circle cx="20" cy="20" r="6" fill="#00F0FF" opacity="0.85" />
        <line x1="20" y1="2" x2="38" y2="18" stroke="#E2E8F0" stroke-width="1.5" stroke-linecap="round" />
      </g>

      <!-- Caixas de som / Monitores de áudio laterais -->
      <rect x="12" y="18" width="18" height="28" rx="3" fill="#152140" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" />
      <circle cx="21" cy="32" r="5" fill="#070C1A" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />

      <rect x="${width - 30}" y="18" width="18" height="28" rx="3" fill="#152140" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" />
      <circle cx="${width - 21}" cy="32" r="5" fill="#070C1A" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />

      <!-- Rótulo GABINE DJ -->
      <text x="${width / 2}" y="32" text-anchor="middle" class="map-label-dj-title">GABINE DJ</text>
    </g>
  `;
}
