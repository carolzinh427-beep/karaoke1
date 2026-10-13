/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DO PALCO (STAGE)
 * ==============================================================================
 * Renderiza o palco oficial no canto superior esquerdo com acabamento em madeira,
 * borda em neon roxo/magenta, refletores cênicos e degraus de acesso.
 * Não possui mesas em frente (área livre para o público e apresentações).
 */

export function renderStage(stageData) {
  const { path, labelX, labelY, neonColor } = stageData;

  return `
    <!-- PALCO SALÃO PRINCIPAL -->
    <g class="map-element map-stage-group" id="mapStage">
      <defs>
        <!-- Gradiente da plataforma de madeira do palco -->
        <linearGradient id="stageDeckGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E1435" />
          <stop offset="45%" stop-color="#140D26" />
          <stop offset="100%" stop-color="#0B061A" />
        </linearGradient>

        <!-- Feixes de luz dos refletores do palco -->
        <radialGradient id="stageSpotlight1" cx="20%" cy="15%" r="60%">
          <stop offset="0%" stop-color="rgba(168, 85, 247, 0.45)" />
          <stop offset="60%" stop-color="rgba(168, 85, 247, 0.1)" />
          <stop offset="100%" stop-color="transparent" />
        </radialGradient>
        <radialGradient id="stageSpotlight2" cx="70%" cy="40%" r="55%">
          <stop offset="0%" stop-color="rgba(0, 240, 255, 0.35)" />
          <stop offset="70%" stop-color="rgba(0, 240, 255, 0.05)" />
          <stop offset="100%" stop-color="transparent" />
        </radialGradient>
      </defs>

      <!-- Sombra de profundidade do palco elevado -->
      <path d="${path}" 
            fill="#05030A" 
            transform="translate(4, 6)" 
            opacity="0.8" 
            filter="blur(4px)" />

      <!-- Plataforma principal do palco -->
      <path d="${path}" 
            fill="url(#stageDeckGradient)" 
            stroke="#2E1C55" 
            stroke-width="2" />

      <!-- Linhas de tabuado de madeira do palco -->
      <path d="M 50,90 Q 200,90 320,70" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" fill="none" />
      <path d="M 50,140 Q 200,140 320,110" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" fill="none" />
      <path d="M 50,190 Q 180,190 280,180" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" fill="none" />
      <path d="M 50,240 Q 120,240 180,250" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" fill="none" />

      <!-- Efeitos de iluminação cênica (spotlights) -->
      <path d="${path}" fill="url(#stageSpotlight1)" style="mix-blend-mode: screen;" />
      <path d="${path}" fill="url(#stageSpotlight2)" style="mix-blend-mode: screen;" />

      <!-- Borda curva com iluminação Neon Neon Purple/Magenta -->
      <path d="M 330,160 Q 250,280 40,280" 
            fill="none" 
            stroke="${neonColor}" 
            stroke-width="4.5" 
            stroke-linecap="round"
            filter="url(#neonGlowPurple)" />

      <!-- Linha neon fina de brilho intenso -->
      <path d="M 330,160 Q 250,280 40,280" 
            fill="none" 
            stroke="#F5D0FE" 
            stroke-width="1.8" 
            stroke-linecap="round" />

      <!-- Degraus / escada de acesso lateral do palco -->
      <g class="stage-stairs" opacity="0.85">
        <rect x="315" y="80" width="22" height="20" rx="3" fill="#1C1333" stroke="rgba(168,85,247,0.4)" stroke-width="1" />
        <rect x="315" y="105" width="22" height="20" rx="3" fill="#180F2C" stroke="rgba(168,85,247,0.4)" stroke-width="1" />
        <rect x="315" y="130" width="22" height="20" rx="3" fill="#140B26" stroke="rgba(168,85,247,0.4)" stroke-width="1" />
      </g>

      <!-- Ícone de Microfone e Rótulo do Palco -->
      <g transform="translate(${labelX}, ${labelY})">
        <!-- Ícone do microfone em SVG -->
        <g transform="translate(-14, -48)">
          <circle cx="14" cy="12" r="18" fill="rgba(168, 85, 247, 0.15)" stroke="rgba(168, 85, 247, 0.4)" stroke-width="1.2" />
          <path d="M14 6 C11.8 6 10 7.8 10 10 L10 16 C10 18.2 11.8 20 14 20 C16.2 20 18 18.2 18 16 L18 10 C18 7.8 16.2 6 14 6 Z" fill="#E9D5FF" />
          <path d="M8 14 C8 17.3 10.7 20 14 20 C17.3 20 20 17.3 20 14" fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round" />
          <line x1="14" y1="20" x2="14" y2="24" stroke="#A855F7" stroke-width="2" stroke-linecap="round" />
          <line x1="11" y1="24" x2="17" y2="24" stroke="#A855F7" stroke-width="2" stroke-linecap="round" />
        </g>

        <!-- Título do Palco -->
        <text x="0" y="-2" text-anchor="middle" class="map-label-stage-title">PALCO</text>
        <text x="0" y="16" text-anchor="middle" class="map-label-stage-sub">SALÃO PRINCIPAL</text>
      </g>
    </g>
  `;
}
