/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — MODAL DE RESERVA (RESERVATION MODAL)
 * ==============================================================================
 * Modal aberto ao clicar em qualquer mesa disponível do mapa 2D ou na lista:
 * - Cabeçalho: "Reserve sua mesa", Nome da Mesa, Capacidade
 * - Data (padrão: hoje)
 * - Horário (padrão: 19:00)
 * - Quantidade de pessoas (até a capacidade da mesa)
 * - Forma de pagamento da entrada (Pix R$ 20, Débito R$ 20, Crédito R$ 25)
 * - Cálculo do valor total em tempo real
 * - Nome, WhatsApp com DDD, E-mail
 * - Botão direto: "Prosseguir para Pagamento (R$ XX,00) →"
 * 
 * Integração autoritativa com o gateway oficial Asaas e Supabase/Firestore.
 * ==============================================================================
 */

import { salvarAgendamento } from '../lib/firebase.js';

export class ReservationModal {
  constructor(options = {}) {
    this.currentTable = null;
    this.selectedMetodo = 'pix'; // 'pix', 'debito', 'credito'
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
            <span class="kmodal-tag">BACKSTAGE KARAOKÊ • SALÃO PRINCIPAL</span>
            <h3 class="kmodal-title" id="kmodalTitle">Reserve sua mesa</h3>
            
            <div class="kmodal-table-badges">
              <span class="kmodal-badge-name" id="kmodalTableName">Mesa</span>
              <span class="kmodal-badge-cap" id="kmodalTableCapacity">Capacidade</span>
            </div>
          </div>

          <form id="kmodalForm" class="kmodal-form" novalidate>
            <!-- LINHA 1: DATA E HORÁRIO -->
            <div class="kmodal-grid-2">
              <div class="kmodal-field-group">
                <label for="kmodalData" class="kmodal-label">Data da Reserva:</label>
                <input type="date" id="kmodalData" class="kmodal-input" required />
              </div>

              <div class="kmodal-field-group">
                <label for="kmodalHorario" class="kmodal-label">Horário de Chegada:</label>
                <select id="kmodalHorario" class="kmodal-select" required>
                  <option value="19:00" selected>19:00</option>
                  <option value="19:30">19:30</option>
                  <option value="20:00">20:00</option>
                  <option value="20:30">20:30</option>
                  <option value="21:00">21:00</option>
                  <option value="21:30">21:30</option>
                  <option value="22:00">22:00</option>
                </select>
              </div>
            </div>

            <!-- LINHA 2: QUANTIDADE DE PESSOAS -->
            <div class="kmodal-field-group">
              <label for="kmodalPessoas" class="kmodal-label">Quantidade de pessoas no seu grupo:</label>
              <select id="kmodalPessoas" class="kmodal-select" required>
                <!-- Populado dinamicamente -->
              </select>
              <small class="kmodal-hint" id="kmodalCapHint">Máximo permitido para esta mesa.</small>
            </div>

            <!-- LINHA 3: FORMA DE PAGAMENTO DA ENTRADA -->
            <div class="kmodal-field-group">
              <label class="kmodal-label">Forma de Pagamento da Entrada:</label>
              <div class="kmodal-pay-methods" id="kmodalPayMethods" role="radiogroup" aria-label="Forma de pagamento">
                <!-- PIX -->
                <div class="kmodal-pay-card selected" data-method="pix" id="kpayPix" role="radio" aria-checked="true" tabindex="0">
                  <div class="kmodal-pay-badge">Recomendado</div>
                  <div class="kmodal-pay-name">Pix</div>
                  <div class="kmodal-pay-rate">R$ 20<span class="kmodal-pay-sub">/pessoa</span></div>
                  <div class="kmodal-pay-note">Aprovação imediata</div>
                </div>

                <!-- DÉBITO -->
                <div class="kmodal-pay-card" data-method="debito" id="kpayDebito" role="radio" aria-checked="false" tabindex="0">
                  <div class="kmodal-pay-name">Débito</div>
                  <div class="kmodal-pay-rate">R$ 20<span class="kmodal-pay-sub">/pessoa</span></div>
                  <div class="kmodal-pay-note">Cartão de débito</div>
                </div>

                <!-- CRÉDITO -->
                <div class="kmodal-pay-card" data-method="credito" id="kpayCredito" role="radio" aria-checked="false" tabindex="0">
                  <div class="kmodal-pay-name">Crédito</div>
                  <div class="kmodal-pay-rate">R$ 25<span class="kmodal-pay-sub">/pessoa</span></div>
                  <div class="kmodal-pay-note">Cartão de crédito</div>
                </div>
              </div>
            </div>

            <!-- LINHA 4: BOX DE TOTAL CALCULADO EM TEMPO REAL -->
            <div class="kmodal-total-box" id="kmodalTotalBox">
              <div class="kmodal-total-header">
                <span class="kmodal-total-label">Valor Total da Reserva:</span>
                <span class="kmodal-total-val" id="kmodalTotalVal">R$ 80,00</span>
              </div>
              <div class="kmodal-total-desc" id="kmodalTotalDesc">4 pessoas × R$ 20,00 no Pix (Aprovação imediata)</div>
            </div>

            <!-- LINHA 5: DADOS DE CONTATO -->
            <div class="kmodal-field-group">
              <label for="kmodalNome" class="kmodal-label">Nome Completo do Titular:</label>
              <input type="text" id="kmodalNome" class="kmodal-input" placeholder="Ex: Maria Clara dos Santos" required autocomplete="name" />
            </div>

            <div class="kmodal-grid-2">
              <div class="kmodal-field-group">
                <label for="kmodalWhatsapp" class="kmodal-label">WhatsApp com DDD:</label>
                <input type="tel" id="kmodalWhatsapp" class="kmodal-input" placeholder="(61) 98765-4321" required autocomplete="tel" />
              </div>

              <div class="kmodal-field-group">
                <label for="kmodalEmail" class="kmodal-label">E-mail para Ingresso:</label>
                <input type="email" id="kmodalEmail" class="kmodal-input" placeholder="seuemail@exemplo.com" required autocomplete="email" />
              </div>
            </div>

            <!-- Mensagem de Alerta/Erro -->
            <div id="kmodalAlert" class="kmodal-alert" style="display: none;"></div>

            <!-- BOTÃO PROSSEGUIR PARA PAGAMENTO -->
            <div class="kmodal-actions">
              <button type="submit" class="kmodal-submit-btn" id="kmodalSubmitBtn">
                <span id="kmodalSubmitTxt">Prosseguir para Pagamento (R$ 80,00)</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </form>
        </div>

        <!-- Tela de Sucesso / Confirmação Visual -->
        <div id="kmodalSuccessView" style="display: none;" class="kmodal-success-box">
          <div class="kmodal-success-icon">✓</div>
          <h4 class="kmodal-success-title">Reserva Selecionada com Sucesso!</h4>
          <p class="kmodal-success-desc">
            Informações confirmadas. Você está sendo direcionado ao pagamento seguro:
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

    // Eventos nos cards de forma de pagamento
    const payCards = this.container.querySelectorAll('.kmodal-pay-card');
    payCards.forEach(card => {
      const selectMethod = () => {
        const method = card.getAttribute('data-method');
        if (method) {
          this.setPaymentMethod(method);
        }
      };
      card.addEventListener('click', selectMethod);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectMethod();
        }
      });
    });

    // Recalcular quando mudar quantidade de pessoas
    const pessoasSelect = document.getElementById('kmodalPessoas');
    if (pessoasSelect) {
      pessoasSelect.addEventListener('change', () => this.updateCalculo());
      pessoasSelect.addEventListener('input', () => this.updateCalculo());
    }

    // Máscara inteligente de telefone WhatsApp
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

  setPaymentMethod(method) {
    this.selectedMetodo = method;
    const payCards = this.container.querySelectorAll('.kmodal-pay-card');
    payCards.forEach(card => {
      const isSelected = card.getAttribute('data-method') === method;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
    this.updateCalculo();
  }

  updateCalculo() {
    const pessoasSelect = document.getElementById('kmodalPessoas');
    const pessoas = parseInt(pessoasSelect?.value || '4', 10);
    const metodo = this.selectedMetodo || 'pix';

    // Pix e Débito: R$ 20/pessoa. Crédito: R$ 25/pessoa
    const tarifa = metodo === 'credito' ? 25 : 20;
    const total = pessoas * tarifa;
    const totalFormatado = `R$ ${total.toFixed(2).replace('.', ',')}`;
    const nomeMetodo = metodo === 'pix' ? 'Pix' : metodo === 'debito' ? 'Cartão de Débito' : 'Cartão de Crédito';

    const totalEl = document.getElementById('kmodalTotalVal');
    const descEl = document.getElementById('kmodalTotalDesc');
    const btnTxt = document.getElementById('kmodalSubmitTxt');

    if (totalEl) totalEl.textContent = totalFormatado;
    if (descEl) {
      descEl.textContent = `${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'} × R$ ${tarifa},00 (${nomeMetodo})`;
    }
    if (btnTxt) {
      btnTxt.textContent = `Prosseguir para Pagamento (${totalFormatado}) →`;
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
    const horarioSelect = document.getElementById('kmodalHorario');

    if (nameEl) nameEl.textContent = table.name;
    if (capEl) capEl.textContent = `Capacidade: ${table.capacity} pessoas`;
    if (capHint) capHint.textContent = `Esta mesa acomoda confortavelmente até ${table.capacity} pessoas.`;

    // Data mínima: hoje
    if (dataInput) {
      const today = new Date().toISOString().split('T')[0];
      dataInput.min = today;
      if (!dataInput.value) dataInput.value = today;
    }

    // Horário: garante padrão 19:00 selecionado
    if (horarioSelect) {
      if (!horarioSelect.value) {
        horarioSelect.value = '19:00';
      }
    }

    // Popula opções de quantidade de pessoas até o limite da mesa
    if (pessoasSelect) {
      pessoasSelect.innerHTML = '';
      for (let i = 1; i <= table.capacity; i++) {
        pessoasSelect.innerHTML += `<option value="${i}">${i} ${i === 1 ? 'pessoa' : 'pessoas'}</option>`;
      }
      // Padrão sugerido confortável
      const defaultQtd = table.capacity >= 4 ? 4 : (table.capacity >= 2 ? 2 : 1);
      pessoasSelect.value = String(defaultQtd);
    }

    // Restaura dados cadastrais salvos no storage se disponíveis
    try {
      const savedNome = localStorage.getItem('bk_cliente_nome');
      const savedZap = localStorage.getItem('bk_cliente_zap');
      const savedEmail = localStorage.getItem('bk_cliente_email');
      const nomeInput = document.getElementById('kmodalNome');
      const zapInput = document.getElementById('kmodalWhatsapp');
      const emailInput = document.getElementById('kmodalEmail');

      if (savedNome && nomeInput && !nomeInput.value) nomeInput.value = savedNome;
      if (savedZap && zapInput && !zapInput.value) zapInput.value = savedZap;
      if (savedEmail && emailInput && !emailInput.value) emailInput.value = savedEmail;
    } catch (e) {}

    // Reseta método para Pix (recomendado) e atualiza total
    this.setPaymentMethod('pix');

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
    }, 180);
  }

  isOpen() {
    return this.container && this.container.style.display !== 'none';
  }

  handleSubmit() {
    const data = document.getElementById('kmodalData')?.value;
    const horarioEl = document.getElementById('kmodalHorario');
    const horario = horarioEl ? (horarioEl.value || '19:00') : '19:00';
    const pessoas = document.getElementById('kmodalPessoas')?.value;
    const nome = document.getElementById('kmodalNome')?.value?.trim();
    const whatsapp = document.getElementById('kmodalWhatsapp')?.value?.trim();
    const email = document.getElementById('kmodalEmail')?.value?.trim();
    const metodo = this.selectedMetodo || 'pix';

    if (!data) {
      document.getElementById('kmodalData')?.focus();
      return this.showAlert('Por favor, selecione a data desejada.');
    }
    if (!horario) {
      horarioEl?.focus();
      return this.showAlert('Por favor, selecione um horário para a reserva.');
    }
    if (!pessoas) {
      document.getElementById('kmodalPessoas')?.focus();
      return this.showAlert('Por favor, informe a quantidade de pessoas.');
    }
    if (!nome) {
      document.getElementById('kmodalNome')?.focus();
      return this.showAlert('Por favor, informe seu nome completo.');
    }

    const cleanZap = (whatsapp || '').replace(/\D/g, '');
    if (!cleanZap || (cleanZap.length !== 10 && cleanZap.length !== 11)) {
      document.getElementById('kmodalWhatsapp')?.focus();
      return this.showAlert('Por favor, informe um WhatsApp válido com DDD (10 ou 11 dígitos).');
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      document.getElementById('kmodalEmail')?.focus();
      return this.showAlert('Por favor, informe um e-mail válido para envio do voucher.');
    }

    const qtdPessoas = parseInt(pessoas, 10);

    // Salva para preenchimento automático futuro
    try {
      localStorage.setItem('bk_cliente_nome', nome);
      localStorage.setItem('bk_cliente_zap', whatsapp);
      localStorage.setItem('bk_cliente_email', email);
    } catch (e) {}

    // Fecha o modal de escolha da mesa imediatamente sem interferir no body.style.overflow
    this.container.classList.remove('kmodal-open');
    this.container.style.display = 'none';

    // Transiciona diretamente para o checkout oficial e tela de pagamento
    if (typeof window !== 'undefined' && window.iniciarPagamentoReservaMesa) {
      window.iniciarPagamentoReservaMesa({
        mesaId: this.currentTable.id,
        mesaNome: this.currentTable.name,
        data,
        horario,
        pessoas: qtdPessoas,
        nome,
        whatsapp,
        email,
        metodo,
        diretoParaPagar: true
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
        email,
        metodo
      });
    }
  }

  showAlert(msg) {
    const el = document.getElementById('kmodalAlert');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  hideAlert() {
    const el = document.getElementById('kmodalAlert');
    if (el) el.style.display = 'none';
  }
}
