/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — COMPONENTE PRINCIPAL DO MAPA INTERATIVO (KARAOKE MAP)
 * ==============================================================================
 * Coordena a planta completa 2D vetorial em SVG:
 * - Desenha piso em ardósia nobre com reflexos e grid sutil
 * - Renderiza Palco, Gabine DJ, Bar, Sofás, Piso LED e Entrada
 * - Renderiza as 11 Mesas independentes
 * - Controles de Zoom e Pan para navegação perfeita no celular e desktop
 * - Modal de Reserva integrado
 * - Suporta alternância dinâmica de status: disponível, selecionada, reservada, indisponível
 */

import { MAP_DIMENSIONS, TABLES_DATA, ARCHITECTURAL_ELEMENTS, getTableById, getTotalCapacity } from './mapData.js';
import { renderStage } from './Stage.js';
import { renderDJBooth } from './DJBooth.js';
import { renderBar } from './Bar.js';
import { renderSofas } from './Sofa.js';
import { renderLEDFloor } from './LEDFloor.js';
import { renderEntrance } from './Entrance.js';
import { renderTable } from './Table.js';
import { ReservationModal } from './ReservationModal.js';

export class KaraokeMap {
  constructor(containerId = 'karaokeMapMount', options = {}) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.options = options;
    this.tables = JSON.parse(JSON.stringify(TABLES_DATA)); // Cópia independente de estado
    this.selectedTableId = null;
    this.currentFilter = 'todas'; // 'todas', 'disponiveis'

    // Estado de Zoom e Pan
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;

    // Instância do Modal de Reserva
    this.modal = new ReservationModal({
      onContinue: (resData) => {
        console.log('Reserva continuada no fluxo visual:', resData);
      },
      onClose: (table) => {
        // Mantém a mesa selecionada destacada no mapa
      }
    });

    this.init();
  }

  init() {
    if (!this.container) {
      console.warn('Container do mapa não encontrado:', this.container);
      return;
    }

    this.renderLayout();
    this.bindEvents();
    this.updateTablesList();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="kmap-wrapper">
        <!-- BARRA SUPERIOR DE CONTROLES E LEGENDA -->
        <div class="kmap-toolbar">
          <div class="kmap-toolbar-left">
            <span class="kmap-live-tag">
              <span class="kmap-live-dot"></span> PLANTA 100% INTERATIVA
            </span>
            <span class="kmap-capacity-pill">Lotação Máxima: ${getTotalCapacity()} pessoas</span>
          </div>

          <div class="kmap-toolbar-right">
            <!-- Filtro de Demonstração de Status -->
            <div class="kmap-filter-group" role="group" aria-label="Filtro de mesas">
              <button type="button" class="kmap-filter-btn active" data-filter="todas" id="kfilterTodas">Todas (11)</button>
              <button type="button" class="kmap-filter-btn" data-filter="disponiveis" id="kfilterDisponiveis">Disponíveis</button>
            </div>

            <!-- Controles de Zoom e Pan -->
            <div class="kmap-zoom-controls" aria-label="Controles de zoom">
              <button type="button" class="kmap-zoom-btn" id="kmapZoomIn" title="Aumentar zoom" aria-label="Aumentar zoom">+</button>
              <button type="button" class="kmap-zoom-btn" id="kmapZoomOut" title="Diminuir zoom" aria-label="Diminuir zoom">−</button>
              <button type="button" class="kmap-zoom-btn" id="kmapZoomReset" title="Ajustar à tela" aria-label="Resetar zoom">⟲</button>
            </div>
          </div>
        </div>

        <!-- ÁREA DO VIEWPORT SVG DO MAPA -->
        <div class="kmap-viewport" id="kmapViewport">
          <div class="kmap-pan-layer" id="kmapPanLayer">
            ${this.buildSvgMap()}
          </div>

          <!-- Tooltip flutuante de hover sobre mesas -->
          <div class="kmap-floating-tooltip" id="kmapTooltip" style="display: none;"></div>

          <!-- Dica indicativa suave -->
          <div class="kmap-touch-hint">
            <span>Toque em qualquer mesa para reservar</span>
          </div>
        </div>

        <!-- PAINEL INFORMATIVO / CARD DA MESA SELECIONADA -->
        <div class="kmap-footer-panel">
          <div class="kmap-selected-card" id="kmapSelectedCard">
            <div class="kselected-info">
              <span class="kselected-badge" id="kselectedBadge">Toque em uma mesa para selecionar</span>
              <strong class="kselected-title" id="kselectedTitle">Escolha sua Mesa na Planta</strong>
              <span class="kselected-desc" id="kselectedDesc">Ao clicar em qualquer mesa disponível, o modal de reserva se abrirá para preenchimento.</span>
            </div>
            <button type="button" class="kmodal-submit-btn kselected-cta-btn" id="kselectedCtaBtn" disabled>
              <span>Reserve sua mesa</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  buildSvgMap() {
    const { width, height, viewBox } = MAP_DIMENSIONS;

    // Renderiza todas as mesas independentes
    const tablesSvg = this.tables.map(t => renderTable(t)).join('');

    return `
      <svg class="kmap-svg" 
           id="kmapSvg" 
           viewBox="${viewBox}" 
           width="100%" 
           height="100%" 
           preserveAspectRatio="xMidYMid meet"
           xmlns="http://www.w3.org/2000/svg">
        
        <!-- DEFINIÇÕES DE FILTROS, GRADIENTES E SOMBRAS DE PROFUNDIDADE -->
        <defs>
          <!-- Brilho Neon Ciano -->
          <filter id="neonGlowCyan" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Brilho Neon Roxo / Magenta -->
          <filter id="neonGlowPurple" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Brilho Neon Rosa (LED Floor) -->
          <filter id="neonGlowPink" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Brilho Neon Verde (LED Floor) -->
          <filter id="neonGlowGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Brilho Neon Azul (LED Floor) -->
          <filter id="neonGlowBlue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Brilho Neon Dourado / Âmbar para Seleção de Mesa -->
          <filter id="neonGlowAmber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Gradiente do Piso do Salão (Ardósia Negra Profunda) -->
          <radialGradient id="roomFloorGradient" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#0E162D" />
            <stop offset="50%" stop-color="#080D1D" />
            <stop offset="100%" stop-color="#04060E" />
          </radialGradient>

          <!-- Gradiente de Madeira Nobre das Mesas -->
          <linearGradient id="tableWoodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1B2640" />
            <stop offset="50%" stop-color="#141E33" />
            <stop offset="100%" stop-color="#0E1524" />
          </linearGradient>

          <!-- Padrão de Revestimento de Piso com Linhas Finas -->
          <pattern id="floorTilePattern" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="none" stroke="rgba(255, 255, 255, 0.02)" stroke-width="0.8" />
          </pattern>
        </defs>

        <!-- 1. PAREDES EXTERNAS E ESTRUTURA DO EDIFÍCIO -->
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="18" 
              fill="#060914" stroke="#1E293B" stroke-width="6" />

        <!-- 2. PISO DO SALÃO PRINCIPAL COM TEXTURA DE ARDÓSIA -->
        <rect x="35" y="35" width="${width - 70}" height="${height - 70}" rx="14" 
              fill="url(#roomFloorGradient)" />
        <rect x="35" y="35" width="${width - 70}" height="${height - 70}" rx="14" 
              fill="url(#floorTilePattern)" />

        <!-- 3. DETALHES DE AMBIENTAÇÃO / ESPAÇO XADREZ (SUPERIOR DIREITO) -->
        <g class="xadrez-room-perimeter">
          <rect x="700" y="35" width="260" height="165" rx="8" 
                fill="#0A0F22" stroke="rgba(234, 179, 8, 0.3)" stroke-width="1.6" />
          <text x="830" y="65" text-anchor="middle" class="map-label-xadrez-title">ESPAÇO XADREZ</text>
        </g>

        <!-- 4. ESTRUTURAS FIXAS ARQUITETÔNICAS (PALCO, DJ, BAR, ENTRADA, LED, SOFÁS) -->
        ${renderStage(ARCHITECTURAL_ELEMENTS.stage)}
        ${renderDJBooth(ARCHITECTURAL_ELEMENTS.djBooth)}
        ${renderBar(ARCHITECTURAL_ELEMENTS.bar)}
        ${renderEntrance(ARCHITECTURAL_ELEMENTS.entrance)}
        ${renderLEDFloor(ARCHITECTURAL_ELEMENTS.ledCross)}
        ${renderSofas(ARCHITECTURAL_ELEMENTS.sofas)}

        <!-- 5. AS 11 MESAS INTERATIVAS INDEPENDENTES -->
        <g class="kmap-tables-layer" id="kmapTablesLayer">
          ${tablesSvg}
        </g>
      </svg>
    `;
  }

  bindEvents() {
    const viewport = document.getElementById('kmapViewport');
    const panLayer = document.getElementById('kmapPanLayer');
    const tooltip = document.getElementById('kmapTooltip');

    // Delegação de Eventos de Clique nas Mesas
    this.container.addEventListener('click', (e) => {
      const tableItem = e.target.closest('.map-table-item');
      if (tableItem) {
        const tableId = tableItem.getAttribute('data-table-id');
        this.handleTableClick(tableId);
      }
    });

    // Tecla Enter/Espaço para acessibilidade
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tableItem = e.target.closest('.map-table-item');
        if (tableItem) {
          e.preventDefault();
          const tableId = tableItem.getAttribute('data-table-id');
          this.handleTableClick(tableId);
        }
      }
    });

    // Hover / Tooltip
    // Hover / Tooltip seguro sem jitter
    if (viewport && tooltip) {
      viewport.addEventListener('mousemove', (e) => {
        const tableItem = e.target.closest('.map-table-item');
        if (tableItem) {
          const tableId = tableItem.getAttribute('data-table-id');
          const table = this.tables.find(t => t.id === tableId);
          if (table) {
            tooltip.innerHTML = `
              <strong>${table.name}</strong> • Capacidade: até ${table.capacity} pessoas<br>
              <small class="ktooltip-status ${table.status}">${this.formatStatus(table.status)}</small>
            `;
            tooltip.style.display = 'block';
            const rect = viewport.getBoundingClientRect();
            const posX = Math.max(90, Math.min(rect.width - 90, e.clientX - rect.left));
            const posY = Math.max(45, e.clientY - rect.top - 12);
            tooltip.style.left = `${posX}px`;
            tooltip.style.top = `${posY}px`;
          }
        } else {
          tooltip.style.display = 'none';
        }
      });

      viewport.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    }

    // Controles de Zoom (mantêm a estrutura fixa no centro)
    const zoomInBtn = document.getElementById('kmapZoomIn');
    const zoomOutBtn = document.getElementById('kmapZoomOut');
    const zoomResetBtn = document.getElementById('kmapZoomReset');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.setZoom(this.zoom + 0.15));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.setZoom(this.zoom - 0.15));
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.resetZoom());

    // Botão de CTA da mesa selecionada
    const ctaBtn = document.getElementById('kselectedCtaBtn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        if (this.selectedTableId) {
          const table = this.tables.find(t => t.id === this.selectedTableId);
          if (table && table.status === 'disponivel') {
            this.modal.open(table);
          }
        }
      });
    }

    // Filtros de status (todas / disponíveis)
    const filterTodas = document.getElementById('kfilterTodas');
    const filterDisp = document.getElementById('kfilterDisponiveis');

    if (filterTodas) {
      filterTodas.addEventListener('click', () => this.applyFilter('todas'));
    }
    if (filterDisp) {
      filterDisp.addEventListener('click', () => this.applyFilter('disponiveis'));
    }
  }

  setZoom(val) {
    this.zoom = Math.max(0.8, Math.min(1.8, val));
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  resetZoom() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  applyTransform() {
    const panLayer = document.getElementById('kmapPanLayer');
    if (panLayer) {
      panLayer.style.transform = `scale(${this.zoom})`;
    }
  }

  handleTableClick(tableId) {
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.status === 'reservada' || table.status === 'indisponivel') {
      alert(`${table.name} está ${this.formatStatus(table.status).toLowerCase()} no momento. Por favor, escolha outra mesa.`);
      return;
    }

    // Seleciona a mesa
    this.selectTable(tableId);

    // Abre o modal de reserva conforme solicitado:
    // "Ao clicar em uma mesa, abrir: Reserve sua mesa, Mesa X, Capacidade: XX pessoas..."
    this.modal.open(table);
  }

  selectTable(tableId) {
    this.selectedTableId = tableId;

    // Atualiza classes visuais de seleção em todos os elementos SVG
    this.tables.forEach(t => {
      const el = document.getElementById(`tableItem_${t.id}`);
      if (el) {
        el.classList.remove('selecionada');
        if (t.id === tableId) {
          el.classList.add('selecionada');
        }
      }
    });

    // Atualiza painel inferior
    const table = this.tables.find(t => t.id === tableId);
    const badge = document.getElementById('kselectedBadge');
    const title = document.getElementById('kselectedTitle');
    const desc = document.getElementById('kselectedDesc');
    const ctaBtn = document.getElementById('kselectedCtaBtn');

    if (table) {
      if (badge) {
        badge.textContent = `✓ ${table.name} Selecionada`;
        badge.className = 'kselected-badge active';
      }
      if (title) title.textContent = `${table.name} • Capacidade para ${table.capacity} pessoas`;
      if (desc) desc.textContent = `${table.location} — ${table.description}`;
      if (ctaBtn) {
        ctaBtn.disabled = false;
        ctaBtn.innerHTML = `<span>Continuar Reserva para ${table.name} (${table.capacity} pessoas) →</span>`;
      }
    }

    this.updateTablesList();
  }

  setTableStatus(tableId, newStatus) {
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return;

    table.status = newStatus;
    const el = document.getElementById(`tableItem_${tableId}`);
    if (el) {
      el.className = `map-table-item ${newStatus} ${this.selectedTableId === tableId ? 'selecionada' : ''}`;
      el.setAttribute('data-status', newStatus);
    }

    this.updateTablesList();
  }

  applyFilter(filterType) {
    this.currentFilter = filterType;

    const filterTodas = document.getElementById('kfilterTodas');
    const filterDisp = document.getElementById('kfilterDisponiveis');

    if (filterTodas) filterTodas.classList.toggle('active', filterType === 'todas');
    if (filterDisp) filterDisp.classList.toggle('active', filterType === 'disponiveis');

    this.tables.forEach(t => {
      const el = document.getElementById(`tableItem_${t.id}`);
      if (el) {
        if (filterType === 'disponiveis' && t.status !== 'disponivel') {
          el.style.opacity = '0.2';
          el.style.pointerEvents = 'none';
        } else {
          el.style.opacity = '';
          el.style.pointerEvents = '';
        }
      }
    });

    this.updateTablesList();
  }

  updateTablesList() {
    // Sincroniza com lista auxiliar se houver no layout da página
    const listContainer = document.getElementById('mapaTablesListScroll');
    if (!listContainer) return;

    const filtered = this.currentFilter === 'disponiveis' 
      ? this.tables.filter(t => t.status === 'disponivel') 
      : this.tables;

    listContainer.innerHTML = filtered.map(t => `
      <div class="table-selection-card ${t.id === this.selectedTableId ? 'selected' : ''} ${t.status}"
           role="button"
           tabindex="0"
           onclick="if(window.karaokeMapInstance) window.karaokeMapInstance.handleTableClick('${t.id}')">
        <div class="table-card-info-main">
          <strong>${t.name} (Até ${t.capacity} pessoas)</strong>
          <span>${t.location}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="table-card-cap-pill ${t.status}">${this.formatStatus(t.status)}</div>
          <button type="button" class="btn btn-primary btn-xs table-quick-book-btn" 
                  onclick="event.stopPropagation(); if(window.karaokeMapInstance) window.karaokeMapInstance.handleTableClick('${t.id}')"
                  ${t.status === 'reservada' || t.status === 'indisponivel' ? 'disabled' : ''}>
            ${t.id === this.selectedTableId ? '✓ Escolhida' : 'Reservar'}
          </button>
        </div>
      </div>
    `).join('');
  }

  formatStatus(st) {
    switch (st) {
      case 'disponivel': return 'Disponível';
      case 'selecionada': return 'Selecionada';
      case 'reservada': return 'Reservada';
      case 'indisponivel': return 'Indisponível';
      default: return st;
    }
  }
}

// Inicializador global exposto para bootstrap
export function initKaraokeMap(containerId = 'karaokeMapMount') {
  window.karaokeMapInstance = new KaraokeMap(containerId);
  return window.karaokeMapInstance;
}
