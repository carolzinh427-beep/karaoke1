/**
 * ==============================================================================
 * REACT BITS — BorderGlow Component (JavaScript + CSS Engine)
 * ==============================================================================
 * Emula o comportamento do componente <BorderGlow /> da biblioteca React Bits:
 * - Conical mesh gradient border com iluminação direcional que segue o cursor
 * - Outer glow layer com sombras multi-camadas
 * - Sweep intro animation suave no carregamento
 * ==============================================================================
 */

function parseHSL(hslStr) {
  const match = String(hslStr || '').match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity = 1.0) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x) { return x * x * x; }

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {
  const t0 = performance.now() + delay;
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  setTimeout(() => requestAnimationFrame(tick), delay);
}

function getCenterOfElement(el) {
  const { width, height } = el.getBoundingClientRect();
  return [width / 2, height / 2];
}

function getEdgeProximity(card, x, y) {
  const [cx, cy] = getCenterOfElement(card);
  const dx = x - cx;
  const dy = y - cy;
  let kx = Infinity;
  let ky = Infinity;
  if (dx !== 0) kx = cx / Math.abs(dx);
  if (dy !== 0) ky = cy / Math.abs(dy);
  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
}

function getCursorAngle(card, x, y) {
  const [cx, cy] = getCenterOfElement(card);
  const dx = x - cx;
  const dy = y - cy;
  if (dx === 0 && dy === 0) return 0;
  const radians = Math.atan2(dy, dx);
  let degrees = radians * (180 / Math.PI) + 90;
  if (degrees < 0) degrees += 360;
  return degrees;
}

export function attachBorderGlow(element, options = {}) {
  const card = typeof element === 'string' ? document.querySelector(element) : element;
  if (!card) return null;

  const edgeSensitivity = options.edgeSensitivity ?? 30;
  const glowColor = options.glowColor || '40 80 80';
  const backgroundColor = options.backgroundColor || '#120F17';
  const borderRadius = options.borderRadius ?? 28;
  const glowRadius = options.glowRadius ?? 40;
  const glowIntensity = options.glowIntensity ?? 1.0;
  const coneSpread = options.coneSpread ?? 25;
  const colors = options.colors || ['#c084fc', '#f472b6', '#38bdf8'];
  const fillOpacity = options.fillOpacity ?? 0.5;
  const animated = options.animated !== undefined ? options.animated : true;

  // Aplica classe base
  card.classList.add('border-glow-card');

  // Assegura edge-light se ainda não existir
  if (!card.querySelector(':scope > .edge-light')) {
    const light = document.createElement('span');
    light.className = 'edge-light';
    card.insertBefore(light, card.firstChild);
  }

  // Define variáveis CSS dinâmicas
  card.style.setProperty('--card-bg', backgroundColor);
  card.style.setProperty('--edge-sensitivity', String(edgeSensitivity));
  card.style.setProperty('--border-radius', `${borderRadius}px`);
  card.style.setProperty('--glow-padding', `${glowRadius}px`);
  card.style.setProperty('--cone-spread', String(coneSpread));
  card.style.setProperty('--fill-opacity', String(fillOpacity));

  const glowVars = buildGlowVars(glowColor, glowIntensity);
  Object.entries(glowVars).forEach(([k, v]) => card.style.setProperty(k, v));

  const gradVars = buildGradientVars(colors);
  Object.entries(gradVars).forEach(([k, v]) => card.style.setProperty(k, v));

  const onPointerMove = (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const edge = getEdgeProximity(card, x, y);
    const angle = getCursorAngle(card, x, y);

    card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  };

  card.addEventListener('pointermove', onPointerMove);

  if (animated) {
    const angleStart = 110;
    const angleEnd = 465;
    card.classList.add('sweep-active');
    card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    animateValue({ duration: 500, onUpdate: v => card.style.setProperty('--edge-proximity', String(v)) });
    animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }});
    animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }});
    animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
      onUpdate: v => card.style.setProperty('--edge-proximity', String(v)),
      onEnd: () => card.classList.remove('sweep-active'),
    });
  }

  return {
    destroy: () => {
      card.removeEventListener('pointermove', onPointerMove);
    }
  };
}

export function initBorderGlow() {
  const cards = document.querySelectorAll('.border-glow-card, [data-border-glow]');
  cards.forEach(card => {
    const animated = card.getAttribute('data-animated') !== 'false';
    const edgeSensitivity = parseFloat(card.getAttribute('data-edge-sensitivity')) || 30;
    const glowRadius = parseFloat(card.getAttribute('data-glow-radius')) || 40;
    const borderRadius = parseFloat(card.getAttribute('data-border-radius')) || 28;
    const glowColor = card.getAttribute('data-glow-color') || '40 80 80';
    const backgroundColor = card.getAttribute('data-background-color') || '#120F17';
    const glowIntensity = parseFloat(card.getAttribute('data-glow-intensity')) || 1.0;
    const coneSpread = parseFloat(card.getAttribute('data-cone-spread')) || 25;
    const rawColors = card.getAttribute('data-colors');
    let colors = ['#c084fc', '#f472b6', '#38bdf8'];
    if (rawColors) {
      try {
        colors = JSON.parse(rawColors);
      } catch(e) {
        colors = rawColors.split(',').map(s => s.trim());
      }
    }
    attachBorderGlow(card, {
      animated,
      edgeSensitivity,
      glowRadius,
      borderRadius,
      glowColor,
      backgroundColor,
      glowIntensity,
      coneSpread,
      colors
    });
  });
}
