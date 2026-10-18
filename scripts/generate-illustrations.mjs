// Generates the original SVG guitar illustrations used for the hero fallback
// and the clearly-labelled demo listings. Run: node scripts/generate-illustrations.mjs
import { writeFileSync } from "node:fs";

const electricBody =
  "M200 228 C160 226 128 244 126 286 C124 316 146 332 140 352 C118 372 104 396 110 428 C118 464 160 478 200 478 C240 478 282 464 290 428 C296 396 282 372 262 354 C255 336 262 318 270 300 C273 280 268 262 250 250 C244 268 233 274 226 262 C220 244 214 230 200 228 Z";
const bassBody =
  "M200 250 C168 246 140 236 128 214 C120 236 126 262 140 284 C150 300 146 318 132 336 C112 362 106 398 118 430 C132 466 168 480 204 478 C244 476 280 458 288 424 C296 392 282 366 264 346 C254 330 256 314 268 298 C284 276 292 248 284 222 C272 240 248 252 200 250 Z";

function guitar(kind) {
  const defs = `<defs>
    <radialGradient id="burst" cx="50%" cy="62%" r="60%">
      <stop offset="0" stop-color="#E9B96B"/><stop offset="0.55" stop-color="#B9772F"/><stop offset="1" stop-color="#3A1F10"/>
    </radialGradient>
    <linearGradient id="neck" x1="0" x2="1"><stop offset="0" stop-color="#5A3A22"/><stop offset="1" stop-color="#7A5233"/></linearGradient>
    <linearGradient id="natural" x1="0" x2="1"><stop offset="0" stop-color="#D9B27A"/><stop offset="1" stop-color="#C4955A"/></linearGradient>
  </defs>`;
  const frets = (y0, y1, n) =>
    Array.from({ length: n }, (_, i) => {
      const y = y0 + (y1 - y0) * (1 - Math.pow(0.94, i + 1)) / (1 - Math.pow(0.94, n));
      return `<line x1="189" x2="211" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#C9C2B4" stroke-width="1.4"/>`;
    }).join("");
  const strings = (y0, y1, count = 6) =>
    Array.from({ length: count }, (_, i) => {
      const x = 192 + (16 / (count - 1)) * i;
      return `<line x1="${x}" x2="${x + (i - (count - 1) / 2) * 0.6}" y1="${y0}" y2="${y1}" stroke="#EDE6D6" stroke-width="0.8" opacity="0.9"/>`;
    }).join("");

  if (kind === "electric") {
    return `${defs}
      <path d="M186 22 L214 22 L222 84 L178 84 Z" fill="#2A1A10"/>
      ${[30, 46, 62].map((y) => `<circle cx="178" cy="${y}" r="4" fill="#CFC6B5"/><circle cx="222" cy="${y}" r="4" fill="#CFC6B5"/>`).join("")}
      <rect x="188" y="84" width="24" height="170" fill="url(#neck)"/>
      ${frets(90, 252, 20)}
      <path d="${electricBody}" fill="url(#burst)" stroke="#F3E3C3" stroke-width="3"/>
      <rect x="182" y="300" width="36" height="22" rx="4" fill="#1E1410" stroke="#E8DCC2" stroke-width="2"/>
      <rect x="182" y="350" width="36" height="22" rx="4" fill="#1E1410" stroke="#E8DCC2" stroke-width="2"/>
      <rect x="178" y="392" width="44" height="7" rx="3" fill="#C9C2B4"/>
      <rect x="180" y="416" width="40" height="9" rx="3" fill="#C9C2B4"/>
      ${[[250, 400], [268, 418], [244, 432], [262, 450]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#C8A060" stroke="#3A1F10"/>`).join("")}
      ${strings(84, 420)}`;
  }
  if (kind === "bass") {
    return `${defs}
      <path d="M190 14 L212 14 L224 70 L182 70 Z" fill="#2A1A10"/>
      ${[22, 40].map((y) => `<circle cx="180" cy="${y}" r="5" fill="#CFC6B5"/><circle cx="222" cy="${y}" r="5" fill="#CFC6B5"/>`).join("")}
      <rect x="189" y="70" width="22" height="200" fill="url(#neck)"/>
      ${frets(76, 268, 20)}
      <path d="${bassBody}" fill="url(#natural)" stroke="#F3E3C3" stroke-width="3"/>
      <path d="M150 300 C170 290 236 290 254 300 L262 380 C240 392 168 392 146 380 Z" fill="#F6EEDC" opacity="0.85"/>
      <rect x="182" y="320" width="36" height="16" rx="5" fill="#1E1410"/>
      <rect x="178" y="420" width="44" height="12" rx="3" fill="#C9C2B4"/>
      ${[[256, 412], [262, 436]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#2A1A10"/>`).join("")}
      ${strings(70, 426, 4)}`;
  }
  const classical = kind === "classical";
  return `${defs}
    ${classical
      ? `<path d="M184 18 L216 18 L218 92 L182 92 Z" fill="#3A2414"/><rect x="190" y="30" width="6" height="44" rx="3" fill="#1E1410"/><rect x="204" y="30" width="6" height="44" rx="3" fill="#1E1410"/>`
      : `<path d="M184 22 L216 22 L220 90 L180 90 Z" fill="#2A1A10"/>${[34, 52, 70].map((y) => `<circle cx="176" cy="${y}" r="4" fill="#CFC6B5"/><circle cx="224" cy="${y}" r="4" fill="#CFC6B5"/>`).join("")}`}
    <rect x="188" y="90" width="24" height="168" fill="url(#neck)"/>
    ${frets(96, 256, classical ? 12 : 14)}
    <ellipse cx="200" cy="300" rx="${classical ? 64 : 72}" ry="58" fill="url(#natural)"/>
    <ellipse cx="200" cy="404" rx="${classical ? 84 : 96}" ry="78" fill="url(#natural)"/>
    <rect x="${classical ? 150 : 140}" y="320" width="${classical ? 100 : 120}" height="40" fill="url(#natural)"/>
    <circle cx="200" cy="318" r="24" fill="#2A1A10"/>
    <circle cx="200" cy="318" r="30" fill="none" stroke="#7A5233" stroke-width="3"/>
    ${classical ? "" : `<path d="M220 340 C250 345 262 380 248 400 L228 392 C238 376 232 356 216 352 Z" fill="#5A3A22" opacity="0.8"/>`}
    <rect x="${classical ? 172 : 170}" y="420" width="${classical ? 56 : 60}" height="12" rx="3" fill="#3A2414"/>
    ${strings(90, 426)}`;
}

function svg(kind, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img" aria-label="${label}">
  <rect width="400" height="500" fill="#ECDFC6"/>
  <circle cx="200" cy="330" r="190" fill="#F5EBD8"/>
  ${guitar(kind)}
  <rect x="12" y="462" width="128" height="26" rx="13" fill="#2D5677"/>
  <text x="76" y="480" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">DEMO IMAGE</text>
</svg>\n`;
}

for (const [kind, label] of [
  ["electric", "Illustration of an electric guitar (demo image)"],
  ["bass", "Illustration of a bass guitar (demo image)"],
  ["acoustic", "Illustration of an acoustic guitar (demo image)"],
  ["classical", "Illustration of a classical guitar (demo image)"],
]) {
  writeFileSync(new URL(`../public/demo/${kind}.svg`, import.meta.url), svg(kind, label));
}

// Hero fallback (shown until the owner uploads a real photo in Admin → Website content)
const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img" aria-label="Illustration of a sunburst electric guitar">
  <defs><radialGradient id="glow" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#4A3529"/><stop offset="1" stop-color="#241A16"/></radialGradient></defs>
  <rect width="400" height="500" fill="url(#glow)"/>
  <g opacity="0.25" stroke="#B08A52">${Array.from({ length: 9 }, (_, i) => `<circle cx="200" cy="330" r="${60 + i * 28}" fill="none"/>`).join("")}</g>
  ${guitar("electric")}
</svg>\n`;
writeFileSync(new URL("../public/hero-guitar.svg", import.meta.url), hero);
console.log("Illustrations written.");
