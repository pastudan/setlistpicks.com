// ─── Config ──────────────────────────────────────────────────────────────────
// true  = each block's stroke is derived from its set ID (consistent across renders).
// false = fully random on every mount (more lively, new stroke each time a block mounts).
export const DETERMINISTIC_HIGHLIGHTS = false;

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
export function seededRandom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return () => {
    h ^= h >>> 13;
    h ^= h << 17;
    h ^= h >>> 5;
    return (h >>> 0) / 0xFFFFFFFF;
  };
}

// ─── Wash path data ───────────────────────────────────────────────────────────
// Returns plain data (not a DOM element) so React can render the paths as JSX.
export function computeWashData(setId) {
  const rng = DETERMINISTIC_HIGHLIGHTS ? seededRandom(setId) : Math.random;
  const j = (spread) => rng() * spread * 2 - spread;

  const filterIndex = Math.floor(rng() * 8) + 1;
  const filterRef   = `url(#roughen-hi-${filterIndex})`;
  const rotation    = -(0.5 + rng() * 1.0);
  const returnOpacity = (0.30 + rng() * 0.28).toFixed(2);
  const tilt = (rng() - 0.5) * 30;
  const a = (x) => -(x / 100) * tilt;

  const p1 = [
    `M -3,${(-2  + j(4) + a(-3)).toFixed(1)}`,
    `C ${(15 + j(5)).toFixed(1)},${(-8  + j(7) + a(15)).toFixed(1)}`,
    `  ${(35 + j(5)).toFixed(1)},${(6   + j(7) + a(35)).toFixed(1)}`,
    `  50,${(-1   + j(7) + a(50)).toFixed(1)}`,
    `C ${(65 + j(5)).toFixed(1)},${(-8  + j(7) + a(65)).toFixed(1)}`,
    `  ${(85 + j(5)).toFixed(1)},${(6   + j(7) + a(85)).toFixed(1)}`,
    `  103,${(-2  + j(4) + a(103)).toFixed(1)}`,
    `L 103,${(102 + j(4) + a(103)).toFixed(1)}`,
    `C ${(85 + j(5)).toFixed(1)},${(108 + j(7) + a(85)).toFixed(1)}`,
    `  ${(65 + j(5)).toFixed(1)},${(95  + j(7) + a(65)).toFixed(1)}`,
    `  50,${(103  + j(7) + a(50)).toFixed(1)}`,
    `C ${(35 + j(5)).toFixed(1)},${(108 + j(7) + a(35)).toFixed(1)}`,
    `  ${(15 + j(5)).toFixed(1)},${(96  + j(7) + a(15)).toFixed(1)}`,
    `  -3,${(102  + j(4) + a(-3)).toFixed(1)}`,
    'Z',
  ].join(' ');

  const yOff = j(4);
  const p2 = [
    `M -3,${(-14  + yOff + j(4) + a(-3)).toFixed(1)}`,
    `C ${(15 + j(5)).toFixed(1)},${(-20 + yOff + j(6) + a(15)).toFixed(1)}`,
    `  ${(35 + j(5)).toFixed(1)},${(-9  + yOff + j(6) + a(35)).toFixed(1)}`,
    `  50,${(-15  + yOff + j(6) + a(50)).toFixed(1)}`,
    `C ${(65 + j(5)).toFixed(1)},${(-20 + yOff + j(6) + a(65)).toFixed(1)}`,
    `  ${(85 + j(5)).toFixed(1)},${(-10 + yOff + j(6) + a(85)).toFixed(1)}`,
    `  103,${(-14 + yOff + j(4) + a(103)).toFixed(1)}`,
    `L 103,${(22  + yOff + j(4) + a(103)).toFixed(1)}`,
    `C ${(85 + j(5)).toFixed(1)},${(28  + yOff + j(6) + a(85)).toFixed(1)}`,
    `  ${(65 + j(5)).toFixed(1)},${(18  + yOff + j(6) + a(65)).toFixed(1)}`,
    `  50,${(24   + yOff + j(6) + a(50)).toFixed(1)}`,
    `C ${(35 + j(5)).toFixed(1)},${(28  + yOff + j(6) + a(35)).toFixed(1)}`,
    `  ${(15 + j(5)).toFixed(1)},${(19  + yOff + j(6) + a(15)).toFixed(1)}`,
    `  -3,${(22   + yOff + j(4) + a(-3)).toFixed(1)}`,
    'Z',
  ].join(' ');

  return { filterRef, rotation, returnOpacity, p1, p2 };
}

// ─── SVG defs injection ───────────────────────────────────────────────────────
let injected = false;
export function ensureSvgDefs() {
  if (injected) return;
  injected = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  svg.setAttribute('aria-hidden', 'true');

  const hiFilters = Array.from({ length: 8 }, (_, i) => `
    <filter id="roughen-hi-${i + 1}" x="-10%" y="-20%" width="120%" height="140%">
      <feTurbulence type="turbulence" baseFrequency="0.035 0.055"
        numOctaves="3" seed="${i + 1}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise"
        scale="4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`).join('');

  svg.innerHTML = `
    <defs>
      ${hiFilters}
      <filter id="roughen">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <symbol id="mark-check" viewBox="0 0 28 28" overflow="visible">
        <polyline points="3,15 10,22 25,5" fill="none"
          stroke="rgba(60,40,0,0.8)" stroke-width="3.2"
          stroke-linecap="round" stroke-linejoin="round" filter="url(#roughen)"/>
      </symbol>
    </defs>`;
  document.body.appendChild(svg);
}
