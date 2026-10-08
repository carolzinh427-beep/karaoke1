/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE DE MESA INDEPENDENTE (TABLE)
 * ==============================================================================
 * Cada mesa é um elemento 2D independente renderizado com sensação de profundidade
 * vista de cima (top-down view).
 * 
 * Interações:
 * - Hover: aumento suave (scale 1.03), sombra mais profunda, borda destacada, cursor pointer.
 * - Clique: elevação suave (translateY -3px scale 1.05), sombra ampliada, brilho neon elegante,
 *   estado 'selecionada', emissão de evento de seleção para abertura do modal.
 * 
 * Status suportados:
 * - 'disponivel': visual elegante com destaque interativo no hover.
 * - 'selecionada': brilho neon dourado/âmbar e elevação ativa.
 * - 'reservada': visual escurecido / desabilitado, cursor not-allowed.
 * - 'indisponivel': visual cinza fosco / desabilitado.
 */

export function renderTable(table) {
  const { id, number, name, capacity, type, x, y, width, height, status, chairsConfig } = table;

  // Centro da mesa
  const centerX = x;
  const centerY = y;
  const halfW = width / 2;
  const halfH = height / 2;

  // Renderiza as cadeiras ao redor da mesa
  const chairsSvg = renderChairs(type, centerX, centerY, width, height, chairsConfig);

  // Renderiza o tampo da mesa conforme o tipo
  const tabletopSvg = renderTabletop(type, centerX, centerY, width, height, capacity);

  return `
    <g class="map-table-item ${status}" 
       id="tableItem_${id}" 
       data-table-id="${id}" 
       data-table-num="${number}"
       data-capacity="${capacity}"
       data-status="${status}"
       role="button"
       tabindex="${status === 'reservada' || status === 'indisponivel' ? '-1' : '0'}"
       aria-label="${name} - Capacidade para ${capacity} pessoas (${status})"
       transform="translate(0, 0)">
      
      <!-- CADEIRAS / ASSENTOS AO REDOR -->
      <g class="table-chairs-group">
        ${chairsSvg}
      </g>

      <!-- TAMPO DA MESA COM PROFUNDIDADE E BRILHO -->
      <g class="tabletop-group">
        ${tabletopSvg}
      </g>
    </g>
  `;
}

/**
 * Renderiza o tampo da mesa (retangular, bistrô redondo, xadrez ou mesa+sofá)
 */
function renderTabletop(type, cx, cy, w, h, capacity) {
  const halfW = w / 2;
  const halfH = h / 2;

  // 1. Mesa Redonda de Bistrô
  if (type === 'bistro') {
    const r = w / 2;
    return `
      <!-- Sombra de profundidade -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#04060E" transform="translate(2, 4)" opacity="0.8" />
      
      <!-- Tampo de madeira escura com aro metálico -->
      <circle cx="${cx}" cy="${cy}" r="${r}" 
              class="table-surface" 
              fill="url(#tableWoodGradient)" 
              stroke="#2A3859" 
              stroke-width="1.8" />
      
      <!-- Aro interno de reflexo cênico -->
      <circle cx="${cx}" cy="${cy}" r="${r - 5}" 
              fill="none" 
              stroke="rgba(0, 240, 255, 0.35)" 
              stroke-width="1" />

      <!-- Capacidade no centro -->
      <g class="table-cap-indicator" pointer-events="none">
        <circle cx="${cx}" cy="${cy}" r="14" fill="rgba(8, 14, 28, 0.92)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" class="map-table-cap-text">${capacity}</text>
      </g>
    `;
  }

  // 2. Mesa Temática de Xadrez
  if (type === 'xadrez') {
    return `
      <!-- Sombra de profundidade -->
      <rect x="${cx - halfW}" y="${cy - halfH}" width="${w}" height="${h}" rx="6" fill="#04060E" transform="translate(2, 4)" opacity="0.8" />
      
      <!-- Base de madeira nobre -->
      <rect x="${cx - halfW}" y="${cy - halfH}" width="${w}" height="${h}" rx="6" 
            class="table-surface" 
            fill="#121828" 
            stroke="#D97706" 
            stroke-width="1.6" />

      <!-- Tabuleiro de xadrez embutido (grade 4x4 estilizada) -->
      <g transform="translate(${cx - 18}, ${cy - 18})">
        <rect x="0" y="0" width="36" height="36" fill="#1C1917" stroke="rgba(255,255,255,0.15)" stroke-width="0.8" />
        <!-- Casas claras -->
        <rect x="0" y="0" width="9" height="9" fill="#F59E0B" opacity="0.85" />
        <rect x="18" y="0" width="9" height="9" fill="#F59E0B" opacity="0.85" />
        <rect x="9" y="9" width="9" height="9" fill="#F59E0B" opacity="0.85" />
        <rect x="27" y="9" width="9" height="9" fill="#F59E0B" opacity="0.85" />
        <rect x="0" y="18" width="9" height="9" fill="#F59E0B" opacity="0.85" />
        <rect x="18" y="18" width="9" height="9" fill="#F59E0B" opacity="0.85" />
        <rect x="9" y="27" width="9" height="9" fill="#F59E0B" opacity="0.85" />
        <rect x="27" y="27" width="9" height="9" fill="#F59E0B" opacity="0.85" />
      </g>

      <!-- Capacidade -->
      <g class="table-cap-indicator" pointer-events="none">
        <rect x="${cx - 15}" y="${cy + halfH - 12}" width="30" height="15" rx="4" fill="rgba(8, 14, 28, 0.95)" stroke="#F59E0B" stroke-width="1" />
        <text x="${cx}" y="${cy + halfH - 1}" text-anchor="middle" class="map-table-cap-text">${capacity}</text>
      </g>
    `;
  }

  // 3. Mesa + Sofá Integrado Canto Direito (Mesa 5 - Capacidade 22)
  if (type === 'sofa_mesa') {
    return `
      <!-- Sombra conjunta -->
      <rect x="${cx - halfW}" y="${cy - halfH}" width="${w}" height="${h}" rx="10" fill="#04060E" transform="translate(3, 4)" opacity="0.8" />

      <!-- Encosto acolchoado do sofá integrado no lado direito -->
      <rect x="${cx + 10}" y="${cy - halfH + 8}" width="${halfW - 10}" height="${h - 16}" rx="8" 
            fill="#0F172E" 
            stroke="rgba(0, 240, 255, 0.3)" 
            stroke-width="1.4" />
      
      <!-- Fita neon do sofá -->
      <line x1="${cx + halfW - 2}" y1="${cy - halfH + 16}" x2="${cx + halfW - 2}" y2="${cy + halfH - 16}" 
            stroke="#00F0FF" stroke-width="2" stroke-linecap="round" />

      <!-- Mesa retangular de madeira no lado esquerdo -->
      <rect x="${cx - halfW}" y="${cy - halfH + 10}" width="${w - 38}" height="${h - 20}" rx="8" 
            class="table-surface" 
            fill="url(#tableWoodGradient)" 
            stroke="#2A3859" 
            stroke-width="1.8" />

      <!-- Linhas decorativas do tampo -->
      <rect x="${cx - halfW + 6}" y="${cy - halfH + 16}" width="${w - 50}" height="${h - 32}" rx="5" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.08)" 
            stroke-width="1" />

      <!-- Emblema de Capacidade (22 Pessoas) -->
      <g class="table-cap-indicator" pointer-events="none">
        <rect x="${cx - halfW + (w - 38)/2 - 18}" y="${cy - 12}" width="36" height="24" rx="6" 
              fill="rgba(6, 12, 26, 0.94)" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.2" />
        <text x="${cx - halfW + (w - 38)/2}" y="${cy + 5}" text-anchor="middle" class="map-table-cap-text">${capacity}</text>
      </g>
    `;
  }

  // 4. Mesa Retangular Padrão (Mesa Comprida ou Lounge Horizontal)
  return `
    <!-- Sombra de profundidade -->
    <rect x="${cx - halfW}" y="${cy - halfH}" width="${w}" height="${h}" rx="8" fill="#04060E" transform="translate(3, 4)" opacity="0.8" />
    
    <!-- Tampo principal de madeira maciça envernizada -->
    <rect x="${cx - halfW}" y="${cy - halfH}" width="${w}" height="${h}" rx="8" 
          class="table-surface" 
          fill="url(#tableWoodGradient)" 
          stroke="#2A3859" 
          stroke-width="1.8" />

    <!-- Moldura interna de chanfro e profundidade -->
    <rect x="${cx - halfW + 6}" y="${cy - halfH + 6}" width="${w - 12}" height="${h - 12}" rx="5" 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.07)" 
          stroke-width="1" />

    <!-- Linhas de tabuas / juntas de madeira -->
    ${h > w ? `
      <line x1="${cx}" y1="${cy - halfH + 12}" x2="${cx}" y2="${cy + halfH - 12}" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" />
    ` : `
      <line x1="${cx - halfW + 12}" y1="${cy}" x2="${cx + halfW - 12}" y2="${cy}" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" />
    `}

    <!-- Emblema de Capacidade no centro da mesa -->
    <g class="table-cap-indicator" pointer-events="none">
      <rect x="${cx - 18}" y="${cy - 12}" width="36" height="24" rx="6" 
            fill="rgba(6, 12, 26, 0.94)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" />
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" class="map-table-cap-text">${capacity}</text>
    </g>
  `;
}

/**
 * Renderiza as cadeiras ao redor da mesa
 */
function renderChairs(type, cx, cy, w, h, config) {
  if (!config) return '';

  const halfW = w / 2;
  const halfH = h / 2;
  let chairs = '';

  // Bistrô redondo (4 banquetas a 45 graus)
  if (config.isRound) {
    const dist = (w / 2) + 16;
    const angles = [45, 135, 225, 315];
    angles.forEach(ang => {
      const rad = (ang * Math.PI) / 180;
      const chX = cx + Math.cos(rad) * dist;
      const chY = cy + Math.sin(rad) * dist;
      chairs += `
        <circle cx="${chX}" cy="${chY}" r="9" class="table-chair" fill="#131B32" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
        <circle cx="${chX}" cy="${chY}" r="3.5" fill="rgba(0,240,255,0.4)" />
      `;
    });
    return chairs;
  }

  // Xadrez (2 poltronas luxuosas)
  if (config.isChess) {
    // Cadeira esquerda
    chairs += `
      <rect x="${cx - halfW - 20}" y="${cy - 16}" width="16" height="32" rx="5" 
            class="table-chair" fill="#1E192D" stroke="rgba(234,179,8,0.4)" stroke-width="1" />
    `;
    // Cadeira direita
    chairs += `
      <rect x="${cx + halfW + 4}" y="${cy - 16}" width="16" height="32" rx="5" 
            class="table-chair" fill="#1E192D" stroke="rgba(234,179,8,0.4)" stroke-width="1" />
    `;
    return chairs;
  }

  // Cadeiras nas laterais esquerda e direita
  if (config.left > 0) {
    const count = config.left;
    const chairH = Math.min(18, (h - 24) / count);
    const spacing = (h - 20) / count;
    for (let i = 0; i < count; i++) {
      const chY = cy - halfH + 10 + i * spacing;
      chairs += `
        <rect x="${cx - halfW - 14}" y="${chY}" width="10" height="${chairH - 3}" rx="3" 
              class="table-chair" fill="#121A30" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
      `;
    }
  }

  if (config.right > 0) {
    const count = config.right;
    const chairH = Math.min(18, (h - 24) / count);
    const spacing = (h - 20) / count;
    for (let i = 0; i < count; i++) {
      const chY = cy - halfH + 10 + i * spacing;
      chairs += `
        <rect x="${cx + halfW + 4}" y="${chY}" width="10" height="${chairH - 3}" rx="3" 
              class="table-chair" fill="#121A30" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
      `;
    }
  }

  // Cabeceiras (topo e fundo)
  if (config.top > 0) {
    chairs += `
      <rect x="${cx - 14}" y="${cy - halfH - 14}" width="28" height="10" rx="3" 
            class="table-chair" fill="#121A30" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
    `;
  }

  if (config.bottom > 0) {
    chairs += `
      <rect x="${cx - 14}" y="${cy + halfH + 4}" width="28" height="10" rx="3" 
            class="table-chair" fill="#121A30" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
    `;
  }

  return chairs;
}
