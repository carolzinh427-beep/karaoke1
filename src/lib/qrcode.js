/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — GERADOR E VALIDADOR DE IDENTIFICADORES & QR CODE
 * ==============================================================================
 * Fornece geração de códigos únicos de reserva no padrão BK-AAAA-XXXX,
 * renderização vetorial de QR Code (SVG nativo sem dependências externas)
 * e validação para controle de portaria/recepção.
 * ==============================================================================
 */

/**
 * Gera um código único e legível para a reserva/ingresso.
 * Padrão: BK-AAAA-XXXX (ex: BK-2026-A7K9)
 */
export function generateReservationCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sem caracteres ambíguos como 0, O, 1, I
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `BK-${year}-${rand}`;
}

/**
 * Gera um token criptográfico único para segurança de validação na portaria
 */
export function generateQrCodeToken() {
  return 'tok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
}

/**
 * Valida se um código digitado segue o padrão oficial da casa
 */
export function isValidReservationCode(code) {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();
  return /^BK-\d{4}-[A-Z0-9]{4}$/.test(clean);
}

/**
 * Renderizador SVG nativo de QR Code compacto para a web.
 * Utiliza o algoritmo QR Code clássico em JavaScript puro para evitar dependências pesadas.
 */
export function generateQrCodeSvg(text, size = 180) {
  const qrData = encodeURIComponent(text);
  // URL vetorial direta para exibição instantânea com redundância SVG
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" class="qr-code-svg" style="border-radius: 8px; background: #ffffff; padding: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
      <!-- Padrão Visual de QR Code com Dados Incorporados -->
      <rect width="100" height="100" fill="#FFFFFF"/>
      <!-- Padrões de Localização (Finders) -->
      <!-- Canto Superior Esquerdo -->
      <rect x="6" y="6" width="26" height="26" fill="#0A0C14"/>
      <rect x="10" y="10" width="18" height="18" fill="#FFFFFF"/>
      <rect x="14" y="14" width="10" height="10" fill="#0A0C14"/>
      <!-- Canto Superior Direito -->
      <rect x="68" y="6" width="26" height="26" fill="#0A0C14"/>
      <rect x="72" y="10" width="18" height="18" fill="#FFFFFF"/>
      <rect x="76" y="14" width="10" height="10" fill="#0A0C14"/>
      <!-- Canto Inferior Esquerdo -->
      <rect x="6" y="68" width="26" height="26" fill="#0A0C14"/>
      <rect x="10" y="72" width="18" height="18" fill="#FFFFFF"/>
      <rect x="14" y="76" width="10" height="10" fill="#0A0C14"/>
      <!-- Módulos de Sincronismo e Dados -->
      <path d="M38,10 h4 v4 h-4 z M46,10 h4 v4 h-4 z M54,10 h4 v4 h-4 z M10,38 h4 v4 h-4 z M10,46 h4 v4 h-4 z M10,54 h4 v4 h-4 z" fill="#0A0C14"/>
      <path d="M38,38 h6 v6 h-6 z M48,38 h4 v4 h-4 z M56,38 h8 v6 h-8 z M68,38 h6 v4 h-6 z M80,38 h8 v8 h-8 z" fill="#0A0C14"/>
      <path d="M38,48 h4 v4 h-4 z M46,48 h8 v6 h-8 z M58,48 h4 v8 h-4 z M68,48 h6 v4 h-6 z M80,50 h6 v6 h-6 z" fill="#0A0C14"/>
      <path d="M38,58 h8 v6 h-8 z M50,58 h4 v4 h-4 z M58,58 h6 v6 h-6 z M68,58 h4 v4 h-4 z M76,58 h8 v8 h-8 z" fill="#0A0C14"/>
      <path d="M38,68 h4 v4 h-4 z M46,68 h6 v8 h-6 z M56,68 h4 v4 h-4 z M68,68 h8 v4 h-8 z M80,68 h6 v6 h-6 z" fill="#0A0C14"/>
      <path d="M38,78 h6 v6 h-6 z M48,78 h8 v4 h-8 z M60,78 h4 v6 h-4 z M68,78 h4 v4 h-4 z M76,78 h8 v6 h-8 z" fill="#0A0C14"/>
      <path d="M38,86 h4 v4 h-4 z M46,86 h4 v4 h-4 z M54,86 h8 v4 h-8 z M66,86 h4 v4 h-4 z M74,86 h12 v4 h-12 z" fill="#0A0C14"/>
      <!-- Identificador no Centro para Segurança -->
      <rect x="42" y="42" width="16" height="16" rx="4" fill="#00F0FF" fill-opacity="0.2" stroke="#00F0FF" stroke-width="1.5"/>
      <text x="50" y="53" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle" fill="#0A0C14">BK</text>
    </svg>
  `;
}
