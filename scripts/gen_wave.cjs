const fs = require('fs');

let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 380" fill="none">\n';
svg += '  <defs>\n';
svg += '    <filter id="pinkGlow" x="-20%" y="-20%" width="140%" height="140%">\n';
svg += '      <feGaussianBlur stdDeviation="3.5" result="blur" />\n';
svg += '      <feMerge>\n';
svg += '        <feMergeNode in="blur" />\n';
svg += '        <feMergeNode in="SourceGraphic" />\n';
svg += '      </feMerge>\n';
svg += '    </filter>\n';
svg += '    <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">\n';
svg += '      <stop offset="0%" stop-color="#FF007A" stop-opacity="0.9" />\n';
svg += '      <stop offset="25%" stop-color="#FF2A85" stop-opacity="1" />\n';
svg += '      <stop offset="50%" stop-color="#E6006F" stop-opacity="0.95" />\n';
svg += '      <stop offset="75%" stop-color="#FF1493" stop-opacity="1" />\n';
svg += '      <stop offset="100%" stop-color="#FF007A" stop-opacity="0.85" />\n';
svg += '    </linearGradient>\n';
svg += '  </defs>\n';
svg += '  <g filter="url(#pinkGlow)" stroke="url(#pinkGrad)" stroke-linecap="round">\n';

const numCurves = 24;
for (let i = 0; i < numCurves; i++) {
  const yBase = -10 + i * 13;
  const amp1 = 30 + (i % 5) * 4;
  const amp2 = 25 + ((i + 2) % 4) * 5;
  const amp3 = 20 + ((i + 1) % 3) * 6;
  const opacity = (0.45 + (i / numCurves) * 0.55).toFixed(2);
  const strokeWidth = (3.5 + (i % 3) * 0.7).toFixed(1);
  const gap = 12 + (i % 3);

  let d = '';
  for (let x = 0; x <= 1920; x += 25) {
    const rad1 = (x / 1920) * Math.PI * 4;
    const rad2 = (x / 1920) * Math.PI * 2.5 + i * 0.12;
    const rad3 = (x / 1920) * Math.PI * 6 + i * 0.08;
    const y = yBase + Math.sin(rad1) * amp1 + Math.cos(rad2) * amp2 + Math.sin(rad3) * amp3;
    if (x === 0) {
      d += `M ${x} ${y.toFixed(1)}`;
    } else {
      d += ` L ${x} ${y.toFixed(1)}`;
    }
  }

  svg += `    <path d="${d}" stroke-width="${strokeWidth}" stroke-dasharray="2 ${gap}" opacity="${opacity}" />\n`;
}

svg += '  </g>\n</svg>';
fs.writeFileSync('public/assets/brand/welcome-wave.svg', svg);
console.log('Generated 1920px welcome-wave.svg successfully, size:', svg.length);
