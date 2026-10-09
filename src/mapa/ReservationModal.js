/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — MODAL DE RESERVA (RESERVATION MODAL)
 * ==============================================================================
 * Modal aberto ao clicar em qualquer mesa disponível do mapa:
 * - "Reserve sua mesa"
 * - Mesa X
 * - Capacidade: XX pessoas
 * - Data: [ selecionar data ]
 * - Horário: [ selecionar horário ]
 * - Quantidade de pessoas: [ selecionar quantidade ]
 * - Nome: [ campo ]
 * - WhatsApp: [ campo ]
 * - E-mail: [ campo ]
 * - Botão: "Continuar"
 * 
 * Integração completa com banco de dados (Supabase & Firestore).
 */

import { salvarAgendamento } from '../lib/firebase.js';

export class ReservationModal {
  constructor(options = {}) {
    this.currentTable = null;
    this.onContinue = options.onContinue || null;
    this.onClose = options.onClose || null;
    this.container = null;
    this.init();
  }

  init() {
    // Remove qualquer modal prévio
    const existing = document.getElementById('karaokeReservationModal');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'karaokeReservationModal';
    this.container.className = 'kmodal-backdrop';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="kmodal-dialog" role="dialog" aria-modal="true" aria-labelledby="kmodalTitle">
        <!-- Botão Fechar -->
        <button type="button" class="kmodal-close-btn" id="kmodalCloseBtn" aria-label="Fechar">&times;</button>
        
        <!-- Conteúdo do Formulário -->
        <div id="kmodalFormView">
          <div class="kmodal-header">
            <span class="kmodal-tag">BACKSTAGE KARAOKÊ</span>
            <h3 class="kmodal-title" id="kmodalTitle">Reserve sua mesa</h3>
            
            <div class="kmodal-table-badges">
              <span class="kmodal-badge-name" id="kmodalTableName">Mesa 1</span>
              <span class="kmodal-badge-cap" id="kmodalTableCapacity">Capacidade: 30 pessoas</span>
            </div>
          </div>

          <form id="kmodalForm" class="kmodal-form" novalidate>
            <!-- 1. DATA -->
            <div class="kmodal-field-group">
              <label for="kmodalData" class="kmodal-label">Data:</label>
              <input type="date" id="kmodalData" class="kmodal-input" required />
            </div>

            <!-- 2. HORÁRIO -->
            <div class="kmodal-field-group">
              <label for="kmodalHorario" class="kmodal-label">Horário:</label>
              <select id="kmodalHorario" class="kmodal-select" required>
                <option value="" disabled selected>Selecione o horário</option>
                <option value="19:00">19:00</option>
                <option value="19:30">19:30</option>
                <option value="20:00">20:00</option>
                <option value="20:30">20:30</option>
                <option value="21:00">21:00</option>
                <option value="21:30">21:30</option>
                <option value="22:00">22:00</option>
              </select>
            </div>

            <!-- 3. QUANTIDADE DE PESSOAS -->
            <div class="kmodal-field-group">
              <label for="kmodalPessoas" class="kmodal-label">Quantidade de pessoas:</label>
              <select id="kmodalPessoas" class="kmodal-select" required>
                <!-- Opções populadas dinamicamente com base na capacidade da mesa -->
              </select>
              <small class="kmodal-hint" id="kmodalCapHint">Máximo permitido para esta mesa.</small>
            </div>

            <!-- 4. NOME -->
            <div class="kmodal-field-group">
              <label for="kmodalNome" class="kmodal-label">Nome:</label>
              <input type="text" id="kmodalNome" class="kmodal-input" placeholder="Seu nome completo" required />
            </div>

            <!-- 5. WHATSAPP -->
            <div class="kmodal-field-group">
              <label for="kmodalWhatsapp" class="kmodal-label">WhatsApp:</label>
              <input type="tel" id="kmodalWhatsapp" class="kmodal-input" placeholder="(61) 99999-9999" required />
            </div>

            <!-- 6. E-MAIL -->
            <div class="kmodal-field-group">
              <label for="kmodalEmail" class="kmodal-label">E-mail:</label>
              <input type="email" id="kmodalEmail" class="kmodal-input" placeholder="seuemail@exemplo.com" required />
            </div>

            <!-- Mensagem de Alerta/Erro -->
            <div id="kmodalAlert" class="kmodal-alert" style="display: none;"></div>

            <!-- BOTÃO CONTINUAR -->
            <div class="kmodal-actions">
              <button type="submit" class="kmodal-submit-btn" id="kmodalSubmitBtn">
                <span>Continuar</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </form>
        </div>

        <!-- Tela de Sucesso / Confirmação Visual -->
        <div id="kmodalSuccessView" style="display: none;" class="kmodal-success-box">
          <div class="kmodal-success-icon">✓</div>
          <h4 class="kmodal-success-title">Reserva Selecionada com Sucesso!</h4>
          <p class="kmodal-success-desc">
            Fluxo visual validado. As informações da sua mesa foram recebidas:
          </p>
          <div class="kmodal-summary-card" id="kmodalSummaryCard"></div>
          <button type="button" class="kmodal-submit-btn secondary" id="kmodalSuccessCloseBtn">
            Voltar ao Mapa do Salão
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.bindEvents();
  }

  bindEvents() {
    // Fechar ao clicar no backdrop ou botão fechar
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });

    const closeBtn = document.getElementById('kmodalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const successCloseBtn = document.getElementById('kmodalSuccessCloseBtn');
    if (successCloseBtn) successCloseBtn.addEventListener('click', () => this.close());

    // Tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Máscara de telefone WhatsApp
    const zapInput = document.getElementById('kmodalWhatsapp');
    if (zapInput) {
      zapInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 10) {
          e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
        } else if (v.length > 6) {
          e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
        } else if (v.length > 2) {
          e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        } else if (v.length > 0) {
          e.target.value = `(${v}`;
        }
      });
    }

    // Submissão do formulário
    const form = document.getElementById('kmodalForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  open(table) {
    if (!table) return;
    this.currentTable = table;

    // Atualiza cabeçalho com os dados da mesa
    const nameEl = document.getElementById('kmodalTableName');
    const capEl = document.getElementById('kmodalTableCapacity');
    const pessoasSelect = document.getElementById('kmodalPessoas');
    const capHint = document.getElementById('kmodalCapHint');
    const dataInput = document.getElementById('kmodalData');

    if (nameEl) nameEl.textContent = table.name;
    if (capEl) capEl.textContent = `Capacidade: ${table.capacity} pessoas`;
    if (capHint) capHint.textContent = `Esta mesa acomoda no máximo até ${table.capacity} pessoas.`;

    // Data mínima: hoje
    if (dataInput) {
      const today = new Date().toISOString().split('T')[0];
      dataInput.min = today;
      if (!dataInput.value) dataInput.value = today;
    }

    // Popula opções de quantidade de pessoas até o limite da mesa
    if (pessoasSelect) {
      pessoasSelect.innerHTML = '';
      pessoasSelect.innerHTML += `<option value="" disabled selected>Selecione a quantidade</option>`;
      for (let i = 1; i <= table.capacity; i++) {
        pessoasSelect.innerHTML += `<option value="${i}">${i} ${i === 1 ? 'pessoa' : 'pessoas'}</option>`;
      }
      // Padrão sugerido
      if (table.capacity >= 4) {
        pessoasSelect.value = '4';
      } else {
        pessoasSelect.value = '2';
      }
    }

    // Reseta visualização
    document.getElementById('kmodalFormView').style.display = 'block';
    document.getElementById('kmodalSuccessView').style.display = 'none';
    this.hideAlert();

    // Exibe modal
    this.container.style.display = 'flex';
    requestAnimationFrame(() => {
      this.container.classList.add('kmodal-open');
    });
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.container.classList.remove('kmodal-open');
    setTimeout(() => {
      this.container.style.display = 'none';
      document.body.style.overflow = '';
      if (this.onClose) this.onClose(this.currentTable);
    }, 200);
  }

  isOpen() {
    return this.container && this.container.style.display !== 'none';
  }

  async handleSubmit() {
    const data = document.getElementById('kmodalData').value;
    const horario = document.getElementById('kmodalHorario').value;
    const pessoas = document.getElementById('kmodalPessoas').value;
    const nome = document.getElementById('kmodalNome').value.trim();
    const whatsapp = document.getElementById('kmodalWhatsapp').value.trim();
    const email = document.getElementById('kmodalEmail').value.trim();

    if (!data) return this.showAlert('Por favor, selecione a data desejada.');
    if (!horario) return this.showAlert('Por favor, selecione um horário para a reserva.');
    if (!pessoas) return this.showAlert('Por favor, informe a quantidade de pessoas.');
    if (!nome) return this.showAlert('Por favor, informe seu nome completo.');
    if (!whatsapp || whatsapp.length < 14) return this.showAlert('Por favor, informe um WhatsApp válido com DDD.');
    if (!email || !email.includes('@')) return this.showAlert('Por favor, informe um e-mail válido.');

    const qtdPessoas = parseInt(pessoas, 10);

    // Fecha o modal do mapa e transiciona para o checkout oficial com pagamento
    this.close();

    if (typeof window !== 'undefined' && window.iniciarPagamentoReservaMesa) {
      window.iniciarPagamentoReservaMesa({
        mesaId: this.currentTable.id,
        mesaNome: this.currentTable.name,
        data,
        horario,
        pessoas: qtdPessoas,
        nome,
        whatsapp,
        email
      });
    }

    if (this.onContinue) {
      this.onContinue({
        table: this.currentTable,
        data,
        horario,
        pessoas: qtdPessoas,
        nome,
        whatsapp,
        email
      });
    }
  }

  showAlert(msg) {
    const el = document.getElementById('kmodalAlert');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  hideAlert() {
    const el = document.getElementById('kmodalAlert');
    if (el) el.style.display = 'none';
  }
}
