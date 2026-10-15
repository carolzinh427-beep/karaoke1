/**
 * ==============================================================================
 * REACT BITS — ShinyText Component (JavaScript + CSS Engine)
 * ==============================================================================
 * Implementa o efeito ShinyText da biblioteca React Bits:
 * - Varredura contínua ou no hover de feixe de luz sobre o texto com gradiente linear
 * - Efeito de brilho suave (glow) com backdrop-filter/blur
 * - Suporta loop, hover, direção, bandas múltiplas e suavização de bordas
 * ==============================================================================
 */

const EASINGS = {
  linear: t => t,
  smooth: t => 0.5 - Math.cos(Math.PI * t) / 2,
  snappy: t => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2)
};
const FALLOFF = [0, 0.2, 0.4, 0.6, 0.8, 1];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

let paint = null;

const parseColor = value => {
  if (typeof document === 'undefined') return null;
  if (!paint) paint = document.createElement('canvas').getContext('2d');
  if (!paint) return null;
  paint.fillStyle = '#000000';
  paint.fillStyle = value;
  const resolved = String(paint.fillStyle);
  if (resolved.startsWith('#')) {
    return [1, 3, 5].map(i => parseInt(resolved.slice(i, i + 2), 16)).concat(1);
  }
  const parts = resolved.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  return [Number(parts[0]), Number(parts[1]), Number(parts[2]), parts.length > 3 ? Number(parts[3]) : 1];
};

const blend = (from, to, amount) => {
  const channel = (a, b) =>
    Math.round(Math.pow(Math.pow(a / 255, 2.2) * (1 - amount) + Math.pow(b / 255, 2.2) * amount, 1 / 2.2) * 255);
  const alpha = from[3] * (1 - amount) + to[3] * amount;
  if (alpha <= 0) return 'rgba(0, 0, 0, 0)';
  const weigh = (a, b) => (a * from[3] * (1 - amount) + b * to[3] * amount) / alpha;
  const r = from[3] === to[3] ? channel(from[0], to[0]) : Math.round(weigh(from[0], to[0]));
  const g = from[3] === to[3] ? channel(from[1], to[1]) : Math.round(weigh(from[1], to[1]));
  const b = from[3] === to[3] ? channel(from[2], to[2]) : Math.round(weigh(from[2], to[2]));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
};

export function attachShinyText(element, customOptions = {}) {
  const root = typeof element === 'string' ? document.querySelector(element) : element;
  if (!root) return null;

  const color = customOptions.color || '#b5b5b5';
  const shineColor = customOptions.shineColor || '#ffffff';
  const speed = Math.max(0.1, customOptions.speed ?? 2);
  const delay = Math.max(0, customOptions.delay ?? 0);
  const angle = customOptions.angle ?? 120;
  const shineWidth = clamp(customOptions.shineWidth ?? 40, 2, 200);
  const softness = clamp(customOptions.softness ?? 0.8, 0, 1);
  const bands = clamp(Math.round(customOptions.bands ?? 1), 1, 3);
  const glow = clamp(customOptions.glow ?? 0, 0, 1);
  const direction = customOptions.direction || 'left';
  const easing = customOptions.easing || 'smooth';
  const trigger = customOptions.trigger || 'loop';
  const yoyo = customOptions.yoyo ?? false;
  const followPointer = customOptions.followPointer ?? false;
  const pauseOnHover = customOptions.pauseOnHover ?? false;
  const disabled = customOptions.disabled ?? false;

  root.classList.add('shiny-text');

  // Adiciona elemento de glow se não existir e glow > 0
  let glowEl = root.querySelector('.shiny-text__glow');
  if (!glowEl && glow > 0) {
    glowEl = document.createElement('span');
    glowEl.className = 'shiny-text__glow';
    glowEl.setAttribute('aria-hidden', 'true');
    glowEl.textContent = root.textContent.trim();
    root.appendChild(glowEl);
  }

  const settings = {
    color,
    shineColor,
    speed,
    delay,
    angle,
    shineWidth,
    softness,
    bands,
    glow,
    sign: direction === 'right' ? 1 : -1,
    ease: EASINGS[easing] || EASINGS.smooth,
    trigger,
    yoyo,
    followPointer,
    pauseOnHover,
    disabled
  };

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const state = {
    pos: null,
    vel: 0,
    phase: 'idle',
    from: 0,
    to: 0,
    start: 0,
    duration: 1,
    resume: 0,
    flip: false,
    inside: false,
    target: 0,
    visible: true,
    seen: false,
    colors: ''
  };

  let base = null;
  let shine = null;
  let clear = null;
  let raf = 0;
  let timer = 0;
  let last = 0;
  let alive = true;

  const extent = () => settings.shineWidth / 2 + (settings.bands - 1) * settings.shineWidth * 1.3 + 2;
  const entry = () => (settings.sign > 0 ? -extent() : 100 + extent());
  const exit = () => (settings.sign > 0 ? 100 + extent() : -extent());
  const nearest = () => (state.target < 50 ? -extent() : 100 + extent());

  const gradient = (pos, fill) => {
    const half = settings.shineWidth / 2;
    const core = half * (1 - settings.softness);
    const fade = half - core;
    const stops = [];
    for (let band = 0; band < settings.bands; band++) {
      const center = pos - settings.sign * band * settings.shineWidth * 1.3;
      const strength = 1 - band * 0.28;
      for (const side of [-1, 1]) {
        for (const f of FALLOFF) {
          const at = center + side * (core + fade * (1 - f));
          const amount = f * f * (3 - 2 * f) * strength;
          stops.push([at, amount]);
        }
      }
    }
    stops.sort((a, b) => a[0] - b[0]);
    const list = stops.map(([at, amount]) => `${blend(fill, shine, amount)} ${at.toFixed(2)}%`);
    return `linear-gradient(${settings.angle}deg, ${blend(fill, shine, 0)} 0%, ${list.join(', ')}, ${blend(fill, shine, 0)} 100%)`;
  };

  const draw = () => {
    const key = `${settings.color}|${settings.shineColor}`;
    if (key !== state.colors) {
      state.colors = key;
      base = parseColor(settings.color);
      shine = parseColor(settings.shineColor);
      clear = shine ? [shine[0], shine[1], shine[2], 0] : null;
    }
    if (!base || !shine) {
      root.style.backgroundImage = `linear-gradient(${settings.color}, ${settings.color})`;
      return;
    }
    if (state.pos === null || settings.disabled) {
      root.style.backgroundImage = `linear-gradient(${settings.color}, ${settings.color})`;
      if (glowEl) glowEl.style.backgroundImage = 'none';
      return;
    }
    root.style.backgroundImage = gradient(state.pos, base);
    if (glowEl) {
      glowEl.style.backgroundImage = gradient(state.pos, clear);
      glowEl.style.opacity = String(settings.glow);
    }
  };

  const sweep = (from, to, now) => {
    const span = Math.abs(exit() - entry()) || 1;
    state.phase = 'sweep';
    state.from = from;
    state.to = to;
    state.start = now;
    state.duration = settings.speed * 1000 * Math.max(0.15, Math.abs(to - from) / span);
  };

  const wake = () => {
    if (raf || !alive) return;
    window.clearTimeout(timer);
    timer = 0;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const tick = now => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (settings.disabled) {
      state.pos = null;
      state.phase = 'idle';
      draw();
      return;
    }
    const following = settings.followPointer && state.inside;
    if (following) {
      if (state.pos === null) state.pos = nearest();
      const stiffness = 220;
      state.vel += ((state.target - state.pos) * stiffness - state.vel * 2 * Math.sqrt(stiffness)) * dt;
      state.pos += state.vel * dt;
      state.phase = 'follow';
      draw();
      raf = requestAnimationFrame(tick);
      return;
    }
    if (state.phase === 'follow') {
      state.vel = 0;
      sweep(state.pos ?? nearest(), nearest(), now);
    }
    if (state.phase === 'sweep') {
      if (settings.pauseOnHover && state.inside) {
        state.start += dt * 1000;
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = clamp((now - state.start) / state.duration, 0, 1);
      state.pos = state.from + (state.to - state.from) * settings.ease(t);
      draw();
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (settings.trigger !== 'loop' || reduce) {
        state.phase = 'idle';
        state.pos = null;
        draw();
        return;
      }
      state.phase = 'wait';
      state.resume = now + settings.delay * 1000;
    }
    if (state.phase === 'wait') {
      if (!state.visible) return;
      if (now < state.resume) {
        window.clearTimeout(timer);
        timer = window.setTimeout(wake, state.resume - now);
        return;
      }
      if (settings.yoyo) {
        state.flip = !state.flip;
        sweep(state.flip ? exit() : entry(), state.flip ? entry() : exit(), now);
      } else {
        sweep(entry(), exit(), now);
      }
      raf = requestAnimationFrame(tick);
      return;
    }
    if (state.phase === 'idle' && settings.trigger === 'loop' && !reduce && state.visible) {
      state.flip = false;
      sweep(entry(), exit(), now);
      raf = requestAnimationFrame(tick);
    }
  };

  const locate = event => {
    const rect = root.getBoundingClientRect();
    const radians = (settings.angle * Math.PI) / 180;
    const dx = Math.sin(radians);
    const dy = -Math.cos(radians);
    const length = Math.abs(rect.width * dx) + Math.abs(rect.height * dy) || 1;
    const along = (event.clientX - rect.left - rect.width / 2) * dx + (event.clientY - rect.top - rect.height / 2) * dy;
    return 50 + (along / length) * 100;
  };

  const onEnter = event => {
    state.inside = true;
    state.target = locate(event);
    if (settings.disabled) return;
    if (settings.followPointer) {
      if (state.pos === null) state.pos = nearest();
    } else if (settings.trigger === 'hover' && state.phase === 'idle' && !reduce) {
      sweep(entry(), exit(), performance.now());
    }
    wake();
  };
  const onMove = event => {
    state.target = locate(event);
    if (settings.followPointer) wake();
  };
  const onLeave = () => {
    state.inside = false;
    wake();
  };

  const observer = new IntersectionObserver(entries => {
    const visible = entries.some(item => item.isIntersecting);
    state.visible = visible;
    if (!visible) return;
    if (settings.trigger === 'view' && !state.seen && !reduce && !settings.disabled) {
      state.seen = true;
      sweep(entry(), exit(), performance.now());
    }
    wake();
  });
  observer.observe(root);

  root.addEventListener('pointerenter', onEnter);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerleave', onLeave);

  // Início imediato da renderização
  draw();
  wake();

  return {
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      observer.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    }
  };
}

export function initShinyText() {
  const elements = document.querySelectorAll('.shiny-text, [data-shiny-text]');
  elements.forEach(el => {
    const color = el.getAttribute('data-color') || '#b5b5b5';
    const shineColor = el.getAttribute('data-shine-color') || '#ffffff';
    const speed = el.hasAttribute('data-speed') ? parseFloat(el.getAttribute('data-speed')) : 2;
    const delay = el.hasAttribute('data-delay') ? parseFloat(el.getAttribute('data-delay')) : 0;
    const angle = el.hasAttribute('data-angle') ? parseFloat(el.getAttribute('data-angle')) : 120;
    const shineWidth = el.hasAttribute('data-shine-width') ? parseFloat(el.getAttribute('data-shine-width')) : 40;
    const softness = el.hasAttribute('data-softness') ? parseFloat(el.getAttribute('data-softness')) : 0.8;
    const bands = el.hasAttribute('data-bands') ? parseInt(el.getAttribute('data-bands'), 10) : 1;
    const glow = el.hasAttribute('data-glow') ? parseFloat(el.getAttribute('data-glow')) : 0;
    const direction = el.getAttribute('data-direction') || 'left';
    const easing = el.getAttribute('data-easing') || 'smooth';
    const trigger = el.getAttribute('data-trigger') || 'loop';
    const yoyo = el.getAttribute('data-yoyo') === 'true';
    const followPointer = el.getAttribute('data-follow-pointer') === 'true';
    const pauseOnHover = el.getAttribute('data-pause-on-hover') === 'true';
    const disabled = el.getAttribute('data-disabled') === 'true';

    attachShinyText(el, {
      color,
      shineColor,
      speed,
      delay,
      angle,
      shineWidth,
      softness,
      bands,
      glow,
      direction,
      easing,
      trigger,
      yoyo,
      followPointer,
      pauseOnHover,
      disabled
    });
  });
}
