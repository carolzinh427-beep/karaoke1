/**
 * ==============================================================================
 * REACT BITS — FadeContent Component (JavaScript + CSS Engine)
 * ==============================================================================
 * Emula o comportamento oficial do componente <FadeContent /> da biblioteca React Bits:
 * Props:
 * - blur: boolean (default: true) -> Inicia com blur(10px) e transiciona para blur(0px)
 * - duration: number (default: 1000ms) -> Duração de 1 segundo
 * - ease: string (default: 'ease-out') -> Curva cúbica suave
 * - initialOpacity: number (default: 0) -> Começa totalmente invisível
 * - threshold: number (default: 0.1) -> Aciona via IntersectionObserver ou imediatamente
 * ==============================================================================
 */

export function triggerFadeContent(element, options = {}) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  const blur = options.blur !== undefined ? options.blur : true;
  const duration = options.duration !== undefined ? options.duration : 1000;
  const ease = options.ease || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const initialOpacity = options.initialOpacity !== undefined ? options.initialOpacity : 0;
  const delay = options.delay || 0;

  // Reset para estado inicial
  el.style.opacity = String(initialOpacity);
  el.style.filter = blur ? 'blur(10px)' : 'blur(0px)';
  el.style.willChange = 'opacity, filter, transform';
  el.style.transition = 'none';

  // Força reflow para aplicar o reset
  void el.offsetWidth;

  // Aplica transição animada FadeContent
  setTimeout(() => {
    el.style.transition = `opacity ${duration}ms ${ease}, filter ${duration}ms ${ease}, transform ${duration}ms ${ease}`;
    el.style.opacity = '1';
    el.style.filter = 'blur(0px)';
  }, delay);
}

export function initFadeContent() {
  const elements = document.querySelectorAll('.fade-content, [data-fade-content]');
  if (!elements.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const blur = el.getAttribute('data-blur') !== 'false';
          const duration = parseInt(el.getAttribute('data-duration'), 10) || 1000;
          const delay = parseInt(el.getAttribute('data-delay'), 10) || 0;

          triggerFadeContent(el, { blur, duration, delay });
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
  } else {
    // Fallback direto
    elements.forEach(el => triggerFadeContent(el));
  }
}
