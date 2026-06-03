// ── Olive Tree Avatar Animation ────────
function renderOliveTree(level = 1) {
  // 5 growth stages
  let stage = level <= 5 ? 1 : level <= 15 ? 2 : level <= 35 ? 3 : level <= 65 ? 4 : 5;

  const trees = {
    // 🌱 Lv 1-5 — Seedling
    1: `<svg class="olive-tree stage-1" viewBox="0 0 80 90" width="70" height="80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="84" rx="18" ry="4" fill="#c8a97a" opacity=".35"/>
      <path d="M40 84 Q40 68 40 58" stroke="#8B6B3D" stroke-width="3" stroke-linecap="round" fill="none"/>
      <g class="olive-leaves">
        <ellipse cx="34" cy="54" rx="7" ry="4" fill="#7daa4a" transform="rotate(-30 34 54)"/>
        <ellipse cx="46" cy="54" rx="7" ry="4" fill="#6b9940" transform="rotate(30 46 54)"/>
        <ellipse cx="40" cy="50" rx="6" ry="3.5" fill="#8bb84e"/>
      </g>
    </svg>`,

    // 🌿 Lv 6-15 — Sapling
    2: `<svg class="olive-tree stage-2" viewBox="0 0 80 90" width="70" height="80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="86" rx="20" ry="4" fill="#c8a97a" opacity=".4"/>
      <path d="M40 86 Q38 70 39 55 Q40 45 40 38" stroke="#7a5c2e" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M39 62 Q28 55 22 50" stroke="#8B6B3D" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M40 55 Q52 48 57 44" stroke="#8B6B3D" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <g class="olive-leaves">
        <ellipse cx="26" cy="50" rx="9" ry="5" fill="#7daa4a" transform="rotate(-20 26 50)"/>
        <ellipse cx="20" cy="47" rx="7" ry="4" fill="#6b9940" transform="rotate(-35 20 47)"/>
        <ellipse cx="55" cy="43" rx="9" ry="5" fill="#8bb84e" transform="rotate(20 55 43)"/>
        <ellipse cx="60" cy="40" rx="7" ry="4" fill="#7daa4a" transform="rotate(35 60 40)"/>
        <ellipse cx="35" cy="36" rx="10" ry="6" fill="#6b9940"/>
        <ellipse cx="44" cy="33" rx="9" ry="5" fill="#7daa4a" transform="rotate(15 44 33)"/>
      </g>
    </svg>`,

    // 🌳 Lv 16-35 — Young tree
    3: `<svg class="olive-tree stage-3" viewBox="0 0 80 90" width="70" height="80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="87" rx="22" ry="5" fill="#c8a97a" opacity=".45"/>
      <path d="M40 87 Q36 72 37 60 Q38 50 39 40" stroke="#6b4c24" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M37 68 Q24 60 16 54" stroke="#7a5c2e" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M38 58 Q52 50 60 44" stroke="#7a5c2e" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M39 48 Q30 38 26 30" stroke="#7a5c2e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M39 45 Q50 36 54 28" stroke="#7a5c2e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <g class="olive-leaves">
        <ellipse cx="18" cy="52" rx="11" ry="6" fill="#7daa4a" transform="rotate(-25 18 52)"/>
        <ellipse cx="11" cy="49" rx="8" ry="5" fill="#6b9940" transform="rotate(-40 11 49)"/>
        <ellipse cx="58" cy="43" rx="11" ry="6" fill="#8bb84e" transform="rotate(25 58 43)"/>
        <ellipse cx="64" cy="40" rx="8" ry="5" fill="#7daa4a" transform="rotate(40 64 40)"/>
        <ellipse cx="26" cy="27" rx="10" ry="6" fill="#6b9940" transform="rotate(-20 26 27)"/>
        <ellipse cx="53" cy="26" rx="10" ry="6" fill="#7daa4a" transform="rotate(20 53 26)"/>
        <ellipse cx="36" cy="22" rx="12" ry="7" fill="#8bb84e"/>
        <ellipse cx="44" cy="19" rx="10" ry="6" fill="#7daa4a" transform="rotate(10 44 19)"/>
        <!-- tiny olives -->
        <circle cx="22" cy="54" r="2.5" fill="#4a7c20" opacity=".7"/>
        <circle cx="61" cy="45" r="2.5" fill="#3d6b1a" opacity=".7"/>
      </g>
    </svg>`,

    // 🫒 Lv 36-65 — Mature tree
    4: `<svg class="olive-tree stage-4" viewBox="0 0 80 90" width="70" height="80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="88" rx="25" ry="5.5" fill="#c8a97a" opacity=".5"/>
      <path d="M40 88 Q34 72 35 58 Q36 46 38 36" stroke="#5a3d1c" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M37 72 Q22 62 12 55" stroke="#6b4c24" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M38 60 Q55 50 65 44" stroke="#6b4c24" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M38 50 Q27 38 22 28" stroke="#6b4c24" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M38 46 Q52 34 57 24" stroke="#6b4c24" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M38 38 Q40 24 40 16" stroke="#7a5c2e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <g class="olive-leaves">
        <ellipse cx="14" cy="53" rx="13" ry="7" fill="#7daa4a" transform="rotate(-25 14 53)"/>
        <ellipse cx="6"  cy="50" rx="9"  ry="5" fill="#6b9940" transform="rotate(-40 6 50)"/>
        <ellipse cx="63" cy="43" rx="13" ry="7" fill="#8bb84e" transform="rotate(25 63 43)"/>
        <ellipse cx="70" cy="40" rx="9"  ry="5" fill="#7daa4a" transform="rotate(40 70 40)"/>
        <ellipse cx="22" cy="25" rx="12" ry="7" fill="#6b9940" transform="rotate(-25 22 25)"/>
        <ellipse cx="57" cy="22" rx="12" ry="7" fill="#7daa4a" transform="rotate(25 57 22)"/>
        <ellipse cx="38" cy="14" rx="14" ry="8" fill="#8bb84e"/>
        <ellipse cx="44" cy="11" rx="11" ry="6" fill="#7daa4a" transform="rotate(12 44 11)"/>
        <ellipse cx="32" cy="10" rx="10" ry="5" fill="#6b9940" transform="rotate(-12 32 10)"/>
        <!-- olives -->
        <circle cx="16"  cy="56" r="3" fill="#4a7c20"/>
        <circle cx="65"  cy="46" r="3" fill="#3d6b1a"/>
        <circle cx="24"  cy="27" r="2.5" fill="#4a7c20"/>
        <circle cx="56"  cy="25" r="2.5" fill="#3d6b1a"/>
        <circle cx="40"  cy="16" r="2.5" fill="#4a7c20"/>
        <circle cx="35"  cy="20" r="2"   fill="#3d6b1a" opacity=".8"/>
      </g>
    </svg>`,

    // 🏛️ Lv 66-100 — Ancient
    5: `<svg class="olive-tree stage-5" viewBox="0 0 80 90" width="70" height="80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="89" rx="28" ry="6" fill="#c8a97a" opacity=".55"/>
      <path d="M40 89 Q32 72 33 56 Q34 44 37 32" stroke="#3d2a0e" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M35 75 Q18 63 7  54" stroke="#5a3d1c" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M36 62 Q56 50 68 43" stroke="#5a3d1c" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M37 52 Q24 38 18 26" stroke="#5a3d1c" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M37 48 Q54 32 60 20" stroke="#5a3d1c" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M37 38 Q38 22 40 12" stroke="#6b4c24" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M36 44 Q26 34 22 24" stroke="#6b4c24" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M38 42 Q50 30 54 20" stroke="#6b4c24" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <g class="olive-leaves">
        <ellipse cx="9"  cy="52" rx="15" ry="8" fill="#7daa4a" transform="rotate(-28 9 52)"/>
        <ellipse cx="2"  cy="48" rx="10" ry="6" fill="#6b9940" transform="rotate(-42 2 48)"/>
        <ellipse cx="66" cy="42" rx="15" ry="8" fill="#8bb84e" transform="rotate(28 66 42)"/>
        <ellipse cx="73" cy="38" rx="10" ry="6" fill="#7daa4a" transform="rotate(42 73 38)"/>
        <ellipse cx="20" cy="23" rx="13" ry="8" fill="#6b9940" transform="rotate(-28 20 23)"/>
        <ellipse cx="60" cy="19" rx="13" ry="8" fill="#7daa4a" transform="rotate(28 60 19)"/>
        <ellipse cx="38" cy="10" rx="16" ry="9" fill="#8bb84e"/>
        <ellipse cx="46" cy="8"  rx="12" ry="7" fill="#7daa4a" transform="rotate(14 46 8)"/>
        <ellipse cx="30" cy="8"  rx="11" ry="6" fill="#6b9940" transform="rotate(-14 30 8)"/>
        <ellipse cx="24" cy="32" rx="10" ry="6" fill="#8bb84e" transform="rotate(-20 24 32)"/>
        <ellipse cx="54" cy="28" rx="10" ry="6" fill="#7daa4a" transform="rotate(20 54 28)"/>
        <!-- many olives -->
        <circle cx="10"  cy="55" r="3.5" fill="#4a7c20"/>
        <circle cx="68"  cy="45" r="3.5" fill="#3d6b1a"/>
        <circle cx="22"  cy="25" r="3"   fill="#4a7c20"/>
        <circle cx="59"  cy="22" r="3"   fill="#3d6b1a"/>
        <circle cx="40"  cy="12" r="3"   fill="#4a7c20"/>
        <circle cx="32"  cy="10" r="2.5" fill="#3d6b1a"/>
        <circle cx="47"  cy="10" r="2.5" fill="#4a7c20"/>
        <circle cx="26"  cy="35" r="2.5" fill="#3d6b1a"/>
        <circle cx="53"  cy="30" r="2.5" fill="#4a7c20"/>
        <circle cx="5"   cy="50" r="2"   fill="#3d6b1a" opacity=".8"/>
        <circle cx="74"  cy="40" r="2"   fill="#4a7c20" opacity=".8"/>
      </g>
    </svg>`
  };
  return trees[stage] || trees[1];
}

