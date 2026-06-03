// ══════════════════════════════════════
// LEVEL SYSTEM — نظام المستويات (100 لفل)
// ══════════════════════════════════════
//
// XP مصادر النقاط:
//   نشر منشور    → 10 xp
//   تعليق        → 5 xp
//   إعجاب مُرسَل → 2 xp
//   متابعة       → 3 xp
//
// شروط الترقية: لازم تحقق الشرطين مع بعض:
//   ① xp >= الحد المطلوب للفل
//   ② messages_sent >= msgs المطلوبة للفل
//
// SQL مطلوب في Supabase:
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS messages_sent integer DEFAULT 0;

const LEVELS = [
  { level: 1,  xp: 0,      msgs: 0,     label: 'Egg',        svg: 'l1'  },
  { level: 2,  xp: 30,     msgs: 5,     label: 'Cracking',   svg: 'l2'  },
  { level: 3,  xp: 80,     msgs: 15,    label: 'Hatched',    svg: 'l3'  },
  { level: 4,  xp: 180,    msgs: 30,    label: 'Chick',      svg: 'l4'  },
  { level: 5,  xp: 350,    msgs: 55,    label: 'Growing',    svg: 'l5'  },
  { level: 6,  xp: 600,    msgs: 90,    label: 'Fledgling',  svg: 'l6'  },
  { level: 7,  xp: 1000,   msgs: 140,   label: 'Young',      svg: 'l7'  },
  { level: 8,  xp: 1600,   msgs: 210,   label: 'Rising',     svg: 'l8'  },
  { level: 9,  xp: 2500,   msgs: 300,   label: 'Swift',      svg: 'l9'  },
  { level: 10, xp: 4000,   msgs: 420,   label: 'Bold',       svg: 'l10' },
  { level: 11, xp: 6000,   msgs: 570,   label: 'Fierce',     svg: 'l11' },
  { level: 12, xp: 9000,   msgs: 750,   label: 'Focused',    svg: 'l12' },
  { level: 13, xp: 13000,  msgs: 970,   label: 'Stern',      svg: 'l13' },
  { level: 14, xp: 18000,  msgs: 1240,  label: 'Shadow',     svg: 'l14' },
  { level: 15, xp: 24000,  msgs: 1560,  label: 'Wrath',      svg: 'l15' },
  { level: 16, xp: 32000,  msgs: 1950,  label: 'Inferno',    svg: 'l16' },
  { level: 17, xp: 42000,  msgs: 2420,  label: 'Royal',      svg: 'l17' },
  { level: 18, xp: 54000,  msgs: 2980,  label: 'Jewel',      svg: 'l18' },
  { level: 19, xp: 69000,  msgs: 3650,  label: 'Heroes',     svg: 'l19' },
  { level: 20, xp: 87000,  msgs: 4500,  label: 'Kings',      svg: 'l20' },
  ...Array.from({ length: 80 }, (_, i) => {
    const n = i + 21;
    const xp   = Math.round(87000 + (n - 20) * 8000 + Math.pow(n - 20, 2) * 300);
    const msgs = Math.round(4500  + (n - 20) * 300  + Math.pow(n - 20, 2) * 15);
    return { level: n, xp, msgs, label: `Lv ${n}`, svg: 'l20' };
  }),
];

const XP_EVENTS = { post: 10, comment: 5, like: 2, follow: 3, message: 1 };

// ── حساب اللفل من XP + الرسائل ────────
// اللفل الحقيقي = أعلى لفل تحققت فيه كلا الشرطين:
//   xp >= المطلوب  &&  msgs >= المطلوب
function getLevelInfo(xp = 0, msgs = 0) {
  let info = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp && msgs >= LEVELS[i].msgs) {
      info = LEVELS[i];
      break;
    }
  }
  const nextIdx = LEVELS.findIndex(l => l.level === info.level + 1);
  const next = nextIdx !== -1 ? LEVELS[nextIdx] : null;

  // نسبة التقدم = أبطأ الشرطين (XP أو رسائل)
  let progress = 100;
  if (next) {
    const xpPct  = Math.min(100, Math.round(((xp   - info.xp)   / (next.xp   - info.xp))   * 100));
    const msgPct = Math.min(100, Math.round(((msgs  - info.msgs) / (next.msgs - info.msgs)) * 100));
    progress = Math.min(xpPct, msgPct);
  }

  return {
    ...info,
    xp,
    msgs,
    nextXp:   next?.xp   ?? info.xp,
    nextMsgs: next?.msgs ?? info.msgs,
    progress,
  };
}

