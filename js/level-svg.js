// ══════════════════════════════════════
// رسومات الصقر — أسلوب Cute Cartoon Eagle
// كل لفل: خلفية دائرية داكنة + وجه صقر كارتوني + تطور تدريجي
// ══════════════════════════════════════
function getLevelSvg(svgKey, size = 28) {
  const s = size;
  const svgs = {

    // ══ L1 — Egg ══
    l1: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#2a1f1a"/>
      <ellipse cx="12" cy="13" rx="7.5" ry="9" fill="#f5ead8" stroke="#d4a843" stroke-width="1.2"/>
      <ellipse cx="9" cy="10" rx="2.5" ry="1.5" fill="#fff" opacity="0.4" transform="rotate(-30 9 10)"/>
    </svg>`,

    // ══ L2 — Cracking ══
    l2: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#2a1f1a"/>
      <ellipse cx="12" cy="13" rx="7.5" ry="9" fill="#f5ead8" stroke="#d4a843" stroke-width="1.2"/>
      <ellipse cx="9" cy="10" rx="2.5" ry="1.5" fill="#fff" opacity="0.35" transform="rotate(-30 9 10)"/>
      <path d="M11 5 L9.5 8.5 L12.5 10.5 L11 14" stroke="#c5832a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M13.5 6 L12.5 9" stroke="#c5832a" stroke-width="1" fill="none" stroke-linecap="round"/>
      <ellipse cx="11" cy="9" rx="2.5" ry="1.8" fill="#ffd54f" opacity="0.4"/>
    </svg>`,

    // ══ L3 — Hatched ══
    l3: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#2a1f1a"/>
      <ellipse cx="12" cy="17" rx="7" ry="5" fill="#ffd54f"/>
      <circle cx="12" cy="10" r="6" fill="#ffd54f"/>
      <ellipse cx="8" cy="11" rx="2" ry="1.5" fill="#ff8a80" opacity="0.6"/>
      <ellipse cx="16" cy="11" rx="2" ry="1.5" fill="#ff8a80" opacity="0.6"/>
      <path d="M9.5 9 Q11 7.5 12.5 9" stroke="#3e2723" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M13.5 9 Q15 7.5 16.5 9" stroke="#3e2723" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M10 12 L12 13.5 L14 12" fill="#ff8f00"/>
      <path d="M7 7 L5.5 4.5 L8.5 6.5 Z" fill="#f5ead8" stroke="#d4a843" stroke-width="0.8"/>
      <path d="M15 7 L17 4.5 L14.5 6.5 Z" fill="#f5ead8" stroke="#d4a843" stroke-width="0.8"/>
    </svg>`,

    // ══ L4 — Chick ══
    l4: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#2a1f1a"/>
      <ellipse cx="12" cy="18" rx="7" ry="5" fill="#ffd54f"/>
      <circle cx="12" cy="10" r="7" fill="#ffd54f"/>
      <ellipse cx="12" cy="12" rx="5" ry="4" fill="#fff9e6"/>
      <ellipse cx="7.5" cy="12" rx="2" ry="1.5" fill="#ff8a80" opacity="0.55"/>
      <ellipse cx="16.5" cy="12" rx="2" ry="1.5" fill="#ff8a80" opacity="0.55"/>
      <circle cx="9.5" cy="9.5" r="2.2" fill="#fff"/>
      <circle cx="9.5" cy="9.5" r="1.4" fill="#2c1810"/>
      <circle cx="8.9" cy="8.9" r="0.55" fill="#fff"/>
      <circle cx="14.5" cy="9.5" r="2.2" fill="#fff"/>
      <circle cx="14.5" cy="9.5" r="1.4" fill="#2c1810"/>
      <circle cx="13.9" cy="8.9" r="0.55" fill="#fff"/>
      <path d="M10 12.5 L12 14 L14 12.5" fill="#ff8f00"/>
      <path d="M10 13.2 Q12 14.5 14 13.2" stroke="#e65100" stroke-width="0.7" fill="none"/>
      <path d="M5 17 Q3 15 5.5 14" stroke="#ffd54f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M19 17 Q21 15 18.5 14" stroke="#ffd54f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L5 — Growing ══
    l5: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#2a1f1a"/>
      <ellipse cx="12" cy="18" rx="7" ry="5" fill="#5d3a1a"/>
      <ellipse cx="12" cy="14" rx="6" ry="3" fill="#fff9f0"/>
      <circle cx="12" cy="9" r="7" fill="#fff9f0"/>
      <ellipse cx="7" cy="12" rx="2" ry="1.5" fill="#ff8a80" opacity="0.5"/>
      <ellipse cx="17" cy="12" rx="2" ry="1.5" fill="#ff8a80" opacity="0.5"/>
      <circle cx="9" cy="8.5" r="2.5" fill="#fff"/>
      <circle cx="9" cy="8.5" r="1.6" fill="#2c1810"/>
      <circle cx="8.3" cy="7.8" r="0.65" fill="#fff"/>
      <circle cx="15" cy="8.5" r="2.5" fill="#fff"/>
      <circle cx="15" cy="8.5" r="1.6" fill="#2c1810"/>
      <circle cx="14.3" cy="7.8" r="0.65" fill="#fff"/>
      <path d="M7.5 6 Q9 4 10.5 5.5" stroke="#5d3a1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M16.5 6 Q15 4 13.5 5.5" stroke="#5d3a1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M9 11.5 L12 13.5 L15 11.5 Q12 13 9 11.5 Z" fill="#ffa000"/>
      <path d="M9 12 Q12 13.5 15 12" stroke="#e65100" stroke-width="0.8" fill="none"/>
      <path d="M4 17 Q1.5 14.5 4.5 13" stroke="#5d3a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M20 17 Q22.5 14.5 19.5 13" stroke="#5d3a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L6 — Fledgling ══
    l6: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#1e1410"/>
      <ellipse cx="12" cy="18.5" rx="7" ry="5" fill="#4a2e10"/>
      <ellipse cx="12" cy="15" rx="6" ry="3" fill="#fff9f0"/>
      <circle cx="12" cy="9" r="7" fill="#fff9f0"/>
      <ellipse cx="6.5" cy="12" rx="2" ry="1.4" fill="#ff8a80" opacity="0.45"/>
      <ellipse cx="17.5" cy="12" rx="2" ry="1.4" fill="#ff8a80" opacity="0.45"/>
      <circle cx="9" cy="8.5" r="2.5" fill="#fff"/>
      <circle cx="9" cy="8.5" r="1.7" fill="#2c1810"/>
      <circle cx="8.3" cy="7.8" r="0.65" fill="#fff"/>
      <circle cx="15" cy="8.5" r="2.5" fill="#fff"/>
      <circle cx="15" cy="8.5" r="1.7" fill="#2c1810"/>
      <circle cx="14.3" cy="7.8" r="0.65" fill="#fff"/>
      <path d="M7 5.5 Q9 3.5 11 5" stroke="#4a2e10" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M17 5.5 Q15 3.5 13 5" stroke="#4a2e10" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M9 11.5 L12 13.5 L15 11.5 Q12 13 9 11.5 Z" fill="#ffa000"/>
      <path d="M4 18 Q1.5 15 4.5 13.5" stroke="#4a2e10" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M20 18 Q22.5 15 19.5 13.5" stroke="#4a2e10" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L7 — Young ══
    l7: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#1a1008"/>
      <ellipse cx="12" cy="19" rx="7" ry="5" fill="#3d2409"/>
      <ellipse cx="12" cy="15" rx="6.5" ry="3.5" fill="#fff9f0"/>
      <circle cx="12" cy="8.5" r="7.5" fill="#fff9f0"/>
      <ellipse cx="6" cy="12" rx="2" ry="1.4" fill="#ff8a80" opacity="0.4"/>
      <ellipse cx="18" cy="12" rx="2" ry="1.4" fill="#ff8a80" opacity="0.4"/>
      <circle cx="8.5" cy="8" r="2.8" fill="#fff"/>
      <circle cx="8.5" cy="8" r="1.9" fill="#1a0e06"/>
      <circle cx="7.8" cy="7.3" r="0.75" fill="#fff"/>
      <circle cx="15.5" cy="8" r="2.8" fill="#fff"/>
      <circle cx="15.5" cy="8" r="1.9" fill="#1a0e06"/>
      <circle cx="14.8" cy="7.3" r="0.75" fill="#fff"/>
      <path d="M6.5 5 Q8.5 2.5 11 4.5" stroke="#3d2409" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M17.5 5 Q15.5 2.5 13 4.5" stroke="#3d2409" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M9 11.5 L12 14 L15 11.5 Q12 13.5 9 11.5 Z" fill="#ff8f00"/>
      <path d="M9 12.2 Q12 14 15 12.2" stroke="#e65100" stroke-width="0.9" fill="none"/>
      <path d="M3.5 18.5 Q0.5 15 3.5 13" stroke="#3d2409" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M20.5 18.5 Q23.5 15 20.5 13" stroke="#3d2409" stroke-width="5" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L8 — Rising ══
    l8: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#120c05"/>
      <ellipse cx="12" cy="19" rx="7" ry="5" fill="#2d1a06"/>
      <ellipse cx="12" cy="15" rx="6.5" ry="3.5" fill="#fff5e6"/>
      <circle cx="12" cy="8" r="8" fill="#fff5e6"/>
      <ellipse cx="5.5" cy="12" rx="2" ry="1.4" fill="#ff8a80" opacity="0.35"/>
      <ellipse cx="18.5" cy="12" rx="2" ry="1.4" fill="#ff8a80" opacity="0.35"/>
      <circle cx="8.5" cy="7.5" r="3" fill="#fff"/>
      <circle cx="8.5" cy="7.5" r="2.1" fill="#0f0905"/>
      <circle cx="7.7" cy="6.7" r="0.8" fill="#fff"/>
      <circle cx="15.5" cy="7.5" r="3" fill="#fff"/>
      <circle cx="15.5" cy="7.5" r="2.1" fill="#0f0905"/>
      <circle cx="14.7" cy="6.7" r="0.8" fill="#fff"/>
      <path d="M6 4.5 L8.5 3 L11 5" stroke="#2d1a06" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18 4.5 L15.5 3 L13 5" stroke="#2d1a06" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 11.5 L12 14.5 L15 11.5 Q12 14 9 11.5 Z" fill="#ff8f00"/>
      <path d="M9 12.5 Q12 14.5 15 12.5" stroke="#e65100" stroke-width="1" fill="none"/>
      <path d="M3 19 Q0 15 3 12.5" stroke="#2d1a06" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M21 19 Q24 15 21 12.5" stroke="#2d1a06" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L9 — Swift ══
    l9: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#0d0802"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#ffa000" stroke-width="1.5" opacity="0.6"/>
      <ellipse cx="12" cy="19" rx="7" ry="5" fill="#1e1005"/>
      <ellipse cx="12" cy="15" rx="6.5" ry="3.5" fill="#fffde7"/>
      <circle cx="12" cy="8" r="8" fill="#fffde7"/>
      <circle cx="8" cy="7.5" r="3.2" fill="#fff"/>
      <circle cx="8" cy="7.5" r="2.3" fill="#0a0604"/>
      <circle cx="7.1" cy="6.6" r="0.9" fill="#fff"/>
      <circle cx="16" cy="7.5" r="3.2" fill="#fff"/>
      <circle cx="16" cy="7.5" r="2.3" fill="#0a0604"/>
      <circle cx="15.1" cy="6.6" r="0.9" fill="#fff"/>
      <path d="M5.5 4 L8.5 2.5 L11 5" stroke="#ffa000" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18.5 4 L15.5 2.5 L13 5" stroke="#ffa000" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 12 L12 15 L15 12 Q12 14.5 9 12 Z" fill="#ff8f00"/>
      <path d="M9 13 Q12 15 15 13" stroke="#e65100" stroke-width="1" fill="none"/>
      <path d="M2.5 19 Q-0.5 15 2.5 12" stroke="#ffa000" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M21.5 19 Q24.5 15 21.5 12" stroke="#ffa000" stroke-width="6" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L10 — Bold ══
    l10: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#0a0601"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#ffd600" stroke-width="2" opacity="0.7"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#160e03"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#fff9e6"/>
      <circle cx="12" cy="8" r="8" fill="#fff9e6"/>
      <path d="M5 3.5 L8.5 2 L12 4 L15.5 2 L19 3.5 L17 4.5 L12 2.8 L7 4.5 Z" fill="#ffd600" stroke="#ff8f00" stroke-width="0.6"/>
      <circle cx="7.5" cy="7.5" r="3.5" fill="#fff"/>
      <circle cx="7.5" cy="7.5" r="2.5" fill="#e65100"/>
      <circle cx="7.5" cy="7.5" r="1.4" fill="#0a0601"/>
      <circle cx="6.6" cy="6.6" r="0.9" fill="#fff"/>
      <circle cx="16.5" cy="7.5" r="3.5" fill="#fff"/>
      <circle cx="16.5" cy="7.5" r="2.5" fill="#e65100"/>
      <circle cx="16.5" cy="7.5" r="1.4" fill="#0a0601"/>
      <circle cx="15.6" cy="6.6" r="0.9" fill="#fff"/>
      <path d="M5 4.5 L8 3.5 L11 6" stroke="#ffd600" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M19 4.5 L16 3.5 L13 6" stroke="#ffd600" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 12 L12 15.5 L15.5 12 Q12 15 8.5 12 Z" fill="#ffd600"/>
      <path d="M8.5 13 Q12 15.5 15.5 13" stroke="#ff8f00" stroke-width="1.2" fill="none"/>
      <path d="M2 19.5 Q-1 15 2 12" stroke="#ffd600" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M22 19.5 Q25 15 22 12" stroke="#ffd600" stroke-width="7" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L11 — Fierce ══
    l11: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#080400"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#ff6d00" stroke-width="1.8" opacity="0.7"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#110800"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#fff5e6"/>
      <circle cx="12" cy="8" r="8" fill="#fff5e6"/>
      <path d="M4 3 Q7 1 11 4" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M20 3 Q17 1 13 4" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="7.5" cy="7.5" r="3.5" fill="#fff"/>
      <circle cx="7.5" cy="7.5" r="2.5" fill="#d50000"/>
      <circle cx="7.5" cy="7.5" r="1.4" fill="#080400"/>
      <circle cx="6.6" cy="6.6" r="0.9" fill="#fff"/>
      <circle cx="16.5" cy="7.5" r="3.5" fill="#fff"/>
      <circle cx="16.5" cy="7.5" r="2.5" fill="#d50000"/>
      <circle cx="16.5" cy="7.5" r="1.4" fill="#080400"/>
      <circle cx="15.6" cy="6.6" r="0.9" fill="#fff"/>
      <path d="M4 4 L8 3 L11 6" stroke="#ff6d00" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 4 L16 3 L13 6" stroke="#ff6d00" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 12 L12 15.5 L15.5 12 Q12 15 8.5 12 Z" fill="#ff8f00"/>
      <path d="M2 19.5 Q-1 15 2 12" stroke="#ff6d00" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M22 19.5 Q25 15 22 12" stroke="#ff6d00" stroke-width="7" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L12 — Focused ══
    l12: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#050300"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#b71c1c" stroke-width="2.5" opacity="0.8"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#0d0500"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#f5efe0"/>
      <circle cx="12" cy="8" r="8" fill="#f5efe0"/>
      <ellipse cx="7.5" cy="8" rx="4" ry="3.5" fill="#1a0a02"/>
      <ellipse cx="16.5" cy="8" rx="4" ry="3.5" fill="#1a0a02"/>
      <circle cx="7.5" cy="8" r="3" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.1" fill="#b71c1c"/>
      <circle cx="7.5" cy="8" r="1.2" fill="#050300"/>
      <circle cx="6.7" cy="7.2" r="0.7" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.1" fill="#b71c1c"/>
      <circle cx="16.5" cy="8" r="1.2" fill="#050300"/>
      <circle cx="15.7" cy="7.2" r="0.7" fill="#fff"/>
      <path d="M3.5 3.5 L8 2.5 L11 6" stroke="#b71c1c" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20.5 3.5 L16 2.5 L13 6" stroke="#b71c1c" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 12.5 L12 16 L15.5 12.5 Q12 15.5 8.5 12.5 Z" fill="#ff8f00"/>
      <path d="M1.5 20 Q-1.5 15 1.5 12" stroke="#b71c1c" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M22.5 20 Q25.5 15 22.5 12" stroke="#b71c1c" stroke-width="8" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L13 — Stern ══
    l13: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#030200"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#7b1fa2" stroke-width="2.5" opacity="0.9"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#0a0010"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#e8e0f0"/>
      <circle cx="12" cy="8" r="8" fill="#e8e0f0"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="3.8" fill="#0a0010"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="3.8" fill="#0a0010"/>
      <circle cx="7.5" cy="8" r="3.2" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.2" fill="#7b1fa2"/>
      <circle cx="7.5" cy="8" r="1.2" fill="#030200"/>
      <circle cx="6.6" cy="7.1" r="0.8" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.2" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.2" fill="#7b1fa2"/>
      <circle cx="16.5" cy="8" r="1.2" fill="#030200"/>
      <circle cx="15.6" cy="7.1" r="0.8" fill="#fff"/>
      <path d="M3 3 L8 2 L11 6" stroke="#7b1fa2" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 3 L16 2 L13 6" stroke="#7b1fa2" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 3 L9 1 L11 2.5 L12 0 L13 2.5 L15 1 L14 3" stroke="#7b1fa2" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 12.5 L12 16.5 L15.5 12.5 Q12 15.5 8.5 12.5 Z" fill="#ce93d8"/>
      <path d="M1 20 Q-2 15 1 12" stroke="#7b1fa2" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M23 20 Q26 15 23 12" stroke="#7b1fa2" stroke-width="9" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L14 — Shadow ══
    l14: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#030000"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#ff1744" stroke-width="3" opacity="0.9"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#100000"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#ffe8e8"/>
      <circle cx="12" cy="8" r="8" fill="#ffe8e8"/>
      <path d="M4 2 Q7 0 11 3" stroke="#ff1744" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M20 2 Q17 0 13 3" stroke="#ff1744" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="3.8" fill="#1a0000"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="3.8" fill="#1a0000"/>
      <circle cx="7.5" cy="8" r="3.2" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.3" fill="#ff1744"/>
      <circle cx="7.5" cy="8" r="1.3" fill="#030000"/>
      <circle cx="6.6" cy="7.1" r="0.8" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.2" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.3" fill="#ff1744"/>
      <circle cx="16.5" cy="8" r="1.3" fill="#030000"/>
      <circle cx="15.6" cy="7.1" r="0.8" fill="#fff"/>
      <path d="M3 2.5 L8 1.5 L11 6" stroke="#ff1744" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 2.5 L16 1.5 L13 6" stroke="#ff1744" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 13 L12 17 L15.5 13 Q12 16 8.5 13 Z" fill="#ff5722"/>
      <path d="M8.5 14 Q12 17 15.5 14" stroke="#d50000" stroke-width="1.2" fill="none"/>
      <path d="M1 20 Q-2.5 15 1 11.5" stroke="#ff1744" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M23 20 Q26.5 15 23 11.5" stroke="#ff1744" stroke-width="10" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L15 — Wrath ══
    l15: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#020100"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#ffd600" stroke-width="2" opacity="0.7"/>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#ff1744" stroke-width="1" opacity="0.5"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#0d0700"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#fff0d0"/>
      <circle cx="12" cy="8" r="8" fill="#fff0d0"/>
      <path d="M4 1.5 L8 0.5 L12 3 L16 0.5 L20 1.5 L18 2.5 L12 1.2 L6 2.5 Z" fill="#ffd600" stroke="#ff8f00" stroke-width="0.7"/>
      <circle cx="12" cy="0.5" r="2" fill="#ffd600"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="4" fill="#100800"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="4" fill="#100800"/>
      <circle cx="7.5" cy="8" r="3.5" fill="#fff"/>
      <circle cx="7.5" cy="8.5" r="2.5" fill="#ff6d00"/>
      <circle cx="7.5" cy="8.5" r="1.5" fill="#ff1744"/>
      <circle cx="7.5" cy="8.5" r="0.8" fill="#020100"/>
      <circle cx="6.8" cy="7.5" r="0.8" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.5" fill="#fff"/>
      <circle cx="16.5" cy="8.5" r="2.5" fill="#ff6d00"/>
      <circle cx="16.5" cy="8.5" r="1.5" fill="#ff1744"/>
      <circle cx="16.5" cy="8.5" r="0.8" fill="#020100"/>
      <circle cx="15.8" cy="7.5" r="0.8" fill="#fff"/>
      <path d="M2.5 2 L8 1 L11 6" stroke="#ffd600" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21.5 2 L16 1 L13 6" stroke="#ffd600" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 13 L12 17.5 L15.5 13 Q12 16.5 8.5 13 Z" fill="#ffd600"/>
      <path d="M8.5 14 Q12 17.5 15.5 14" stroke="#ff8f00" stroke-width="1.2" fill="none"/>
      <path d="M0.5 20.5 Q-3 15 0.5 11" stroke="#ffd600" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M23.5 20.5 Q27 15 23.5 11" stroke="#ffd600" stroke-width="11" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L16 — Inferno ══
    l16: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#080010"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#aa00ff" stroke-width="3" opacity="0.9"/>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#ffd600" stroke-width="1.5" opacity="0.5"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#100020"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#f0e8ff"/>
      <circle cx="12" cy="8" r="8" fill="#f0e8ff"/>
      <path d="M3 1.5 L7 0 L10.5 2.5 L12 0 L13.5 2.5 L17 0 L21 1.5 L18.5 3 L12 1.5 L5.5 3 Z" fill="#ffd600" stroke="#ff8f00" stroke-width="0.7"/>
      <circle cx="12" cy="0" r="2.5" fill="#aa00ff"/>
      <circle cx="7" cy="0" r="1.5" fill="#ffd600"/>
      <circle cx="17" cy="0" r="1.5" fill="#ffd600"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="4" fill="#100020"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="4" fill="#100020"/>
      <circle cx="7.5" cy="8" r="3.5" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.5" fill="#aa00ff"/>
      <circle cx="7.5" cy="8" r="1.4" fill="#080010"/>
      <circle cx="6.6" cy="7.1" r="0.8" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.5" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.5" fill="#aa00ff"/>
      <circle cx="16.5" cy="8" r="1.4" fill="#080010"/>
      <circle cx="15.6" cy="7.1" r="0.8" fill="#fff"/>
      <path d="M2 2 L7.5 0.5 L11 6" stroke="#aa00ff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 2 L16.5 0.5 L13 6" stroke="#aa00ff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 13 L12 17.5 L15.5 13 Q12 16.5 8.5 13 Z" fill="#aa00ff"/>
      <path d="M8.5 14 Q12 17.5 15.5 14" stroke="#7b00d4" stroke-width="1.2" fill="none"/>
      <path d="M0 21 Q-3.5 15 0 10.5" stroke="#aa00ff" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M24 21 Q27.5 15 24 10.5" stroke="#aa00ff" stroke-width="12" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L17 — Royal ══
    l17: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#00080a"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#00e5ff" stroke-width="2.5" opacity="0.9"/>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#aa00ff" stroke-width="1.5" opacity="0.6"/>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#ffd600" stroke-width="1" opacity="0.4"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#001015"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#e0f8ff"/>
      <circle cx="12" cy="8" r="8" fill="#e0f8ff"/>
      <path d="M3 1.5 L7 0 L10.5 2.5 L12 0 L13.5 2.5 L17 0 L21 1.5 L18.5 3 L12 1.5 L5.5 3 Z" fill="#00e5ff" stroke="#0097a7" stroke-width="0.7"/>
      <circle cx="12" cy="0" r="2.5" fill="#00e5ff"/>
      <circle cx="7" cy="0" r="1.5" fill="#aa00ff"/>
      <circle cx="17" cy="0" r="1.5" fill="#ffd600"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="4" fill="#001015"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="4" fill="#001015"/>
      <circle cx="7.5" cy="8" r="3.5" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.5" fill="#00b0d4"/>
      <circle cx="7.5" cy="8" r="1.4" fill="#00080a"/>
      <circle cx="6.6" cy="7.1" r="0.8" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.5" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.5" fill="#00b0d4"/>
      <circle cx="16.5" cy="8" r="1.4" fill="#00080a"/>
      <circle cx="15.6" cy="7.1" r="0.8" fill="#fff"/>
      <path d="M2 2 L7.5 0.5 L11 6" stroke="#00e5ff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 2 L16.5 0.5 L13 6" stroke="#00e5ff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 13 L12 17.5 L15.5 13 Q12 16.5 8.5 13 Z" fill="#00b0d4"/>
      <path d="M8.5 14 Q12 17.5 15.5 14" stroke="#0088aa" stroke-width="1.2" fill="none"/>
      <path d="M0 21 Q-3.5 15 0 10.5" stroke="#00e5ff" stroke-width="13" fill="none" stroke-linecap="round"/>
      <path d="M24 21 Q27.5 15 24 10.5" stroke="#00e5ff" stroke-width="13" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L18 — Jewel ══
    l18: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#080600"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#ffd600" stroke-width="4" opacity="1"/>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff8e1" stroke-width="1" opacity="0.4"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#0f0a00"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#fffde7"/>
      <circle cx="12" cy="8" r="8" fill="#fffde7"/>
      <path d="M3 1 L7 -0.5 L10.5 2 L12 -0.5 L13.5 2 L17 -0.5 L21 1 L18.5 2.5 L12 1.2 L5.5 2.5 Z" fill="#ffd600" stroke="#ff8f00" stroke-width="0.8"/>
      <circle cx="12" cy="-0.5" r="3" fill="#ffd600"/>
      <circle cx="7" cy="-0.5" r="2" fill="#ffd600"/>
      <circle cx="17" cy="-0.5" r="2" fill="#ffd600"/>
      <path d="M9.5 3 L10 6" stroke="#c8a000" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="4" fill="#0f0a00"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="4" fill="#0f0a00"/>
      <circle cx="7.5" cy="8" r="3.7" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.8" fill="#ffa000"/>
      <circle cx="7.5" cy="8" r="1.6" fill="#080600"/>
      <circle cx="6.5" cy="7" r="0.9" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.7" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.8" fill="#ffa000"/>
      <circle cx="16.5" cy="8" r="1.6" fill="#080600"/>
      <circle cx="15.5" cy="7" r="0.9" fill="#fff"/>
      <path d="M2 1.5 L7.5 0 L11 6" stroke="#ffd600" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 1.5 L16.5 0 L13 6" stroke="#ffd600" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 13 L12 17.5 L15.5 13 Q12 16.5 8.5 13 Z" fill="#ffa000"/>
      <path d="M8.5 14 Q12 17.5 15.5 14" stroke="#e65100" stroke-width="1.2" fill="none"/>
      <path d="M0 21 Q-3.5 15 0 10.5" stroke="#ffd600" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M24 21 Q27.5 15 24 10.5" stroke="#ffd600" stroke-width="14" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L19 — Heroes ══
    l19: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#000510"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#e0f0ff" stroke-width="3.5" opacity="1"/>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#80d8ff" stroke-width="2" opacity="0.7"/>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#000a1a"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#f0f8ff"/>
      <circle cx="12" cy="8" r="8" fill="#f0f8ff"/>
      <path d="M5 4 Q8 1.5 12 3" stroke="#80d8ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M19 4 Q16 1.5 12 3" stroke="#80d8ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M3.5 1 L7.5 -0.5 L11 2 L12 -0.5 L13 2 L16.5 -0.5 L20.5 1 L18 2.5 L12 1.2 L6 2.5 Z" fill="#80d8ff" stroke="#40c4ff" stroke-width="0.8"/>
      <circle cx="12" cy="-0.5" r="2.5" fill="#80d8ff"/>
      <circle cx="7.5" cy="-0.5" r="1.8" fill="#fff"/>
      <circle cx="16.5" cy="-0.5" r="1.8" fill="#fff"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="4" fill="#000a1a"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="4" fill="#000a1a"/>
      <circle cx="7.5" cy="8" r="3.7" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.8" fill="#40c4ff"/>
      <circle cx="7.5" cy="8" r="1.6" fill="#000510"/>
      <circle cx="6.5" cy="7" r="1" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.7" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.8" fill="#40c4ff"/>
      <circle cx="16.5" cy="8" r="1.6" fill="#000510"/>
      <circle cx="15.5" cy="7" r="1" fill="#fff"/>
      <path d="M2 1.5 L7.5 0 L11 6" stroke="#80d8ff" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 1.5 L16.5 0 L13 6" stroke="#80d8ff" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 13 L12 18 L15.5 13 Q12 17 8.5 13 Z" fill="#40c4ff"/>
      <path d="M8.5 14 Q12 18 15.5 14" stroke="#0091ea" stroke-width="1.2" fill="none"/>
      <path d="M0 21 Q-4 15 0 10" stroke="#80d8ff" stroke-width="15" fill="none" stroke-linecap="round"/>
      <path d="M24 21 Q28 15 24 10" stroke="#80d8ff" stroke-width="15" fill="none" stroke-linecap="round"/>
    </svg>`,

    // ══ L20 — Kings ══
    l20: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#020100"/>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#ffd600" stroke-width="4" opacity="1"/>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#ff6d00" stroke-width="2" opacity="0.7"/>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#aa00ff" stroke-width="1.5" opacity="0.5"/>
      <ellipse cx="12" cy="19.5" rx="7" ry="5" fill="#0a0600"/>
      <ellipse cx="12" cy="15.5" rx="6.5" ry="3.5" fill="#fff9e6"/>
      <circle cx="12" cy="8" r="8" fill="#fff9e6"/>
      <path d="M3 0.5 L7 -1 L10.5 1.5 L12 -1 L13.5 1.5 L17 -1 L21 0.5 L18.5 2 L12 0.7 L5.5 2 Z" fill="#ffd600" stroke="#ff8f00" stroke-width="0.9"/>
      <circle cx="12" cy="-1" r="3" fill="#ffd600"/>
      <circle cx="7" cy="-1" r="2" fill="#ff6d00"/>
      <circle cx="17" cy="-1" r="2" fill="#aa00ff"/>
      <path d="M6 4 Q8 1.5 12 3.5 Q16 1.5 18 4" fill="#fff3cd" stroke="#ffd600" stroke-width="1.2"/>
      <ellipse cx="7.5" cy="8" rx="4.5" ry="4" fill="#0a0600"/>
      <ellipse cx="16.5" cy="8" rx="4.5" ry="4" fill="#0a0600"/>
      <circle cx="7.5" cy="8" r="3.8" fill="#fff"/>
      <circle cx="7.5" cy="8" r="2.9" fill="#ff6d00"/>
      <circle cx="7.5" cy="8.5" r="2" fill="#ffd600"/>
      <circle cx="7.5" cy="8.5" r="1" fill="#020100"/>
      <circle cx="6.5" cy="7" r="1" fill="#fff"/>
      <circle cx="16.5" cy="8" r="3.8" fill="#fff"/>
      <circle cx="16.5" cy="8" r="2.9" fill="#ff6d00"/>
      <circle cx="16.5" cy="8.5" r="2" fill="#ffd600"/>
      <circle cx="16.5" cy="8.5" r="1" fill="#020100"/>
      <circle cx="15.5" cy="7" r="1" fill="#fff"/>
      <path d="M2 1 L8 -0.5 L11 6" stroke="#ffd600" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 1 L16 -0.5 L13 6" stroke="#ffd600" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8 13.5 L12 18.5 L16 13.5 Q12 17.5 8 13.5 Z" fill="#ffd600"/>
      <path d="M8 14.5 Q12 18.5 16 14.5" stroke="#ff6d00" stroke-width="1.5" fill="none"/>
      <path d="M0 21 Q-4 15 0 10" stroke="#ffd600" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M24 21 Q28 15 24 10" stroke="#ffd600" stroke-width="16" fill="none" stroke-linecap="round"/>
    </svg>`,
  };
  return svgs[svgKey] || svgs['l1'];
}

