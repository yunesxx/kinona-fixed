// ── Badge HTML ─────────────────────────
function makeLevelBadge(xp = 0, msgs = 0, size = 28) {
  const info = getLevelInfo(xp, msgs);
  return `<span class="level-badge" title="لفل ${info.level} — ${info.label} (${xp} xp | ${msgs} رسالة)" data-level="${info.level}">${getLevelSvg(info.svg, size)}<span class="level-num">Lv.${info.level}</span></span>`;
}

// ── تحميل xp + messages_sent للمستخدم ─
const _statsCache = {};
async function fetchUserStats(userId) {
  if (_statsCache[userId]) return _statsCache[userId];
  const { data } = await sb.from('profiles').select('xp, messages_sent').eq('id', userId).single();
  const stats = { xp: data?.xp || 0, msgs: data?.messages_sent || 0 };
  _statsCache[userId] = stats;
  return stats;
}
// للتوافق مع الكود القديم
async function fetchUserXP(userId) {
  const s = await fetchUserStats(userId);
  return s.xp;
}

// ── إضافة XP لليوزر الحالي ────────────
async function addXP(event) {
  const gain = XP_EVENTS[event] || 0;
  if (!gain || !currentUser) return;
  const { data } = await sb.from('profiles').select('xp, messages_sent').eq('id', currentUser.id).single();
  const oldXp  = data?.xp || 0;
  const msgs   = data?.messages_sent || 0;
  const newXp  = oldXp + gain;
  await sb.from('profiles').update({ xp: newXp }).eq('id', currentUser.id);
  if (_statsCache[currentUser.id]) _statsCache[currentUser.id] = { xp: newXp, msgs };
  const oldLevel = getLevelInfo(oldXp, msgs).level;
  const newLevel = getLevelInfo(newXp, msgs).level;
  if (newLevel > oldLevel) {
    const info = getLevelInfo(newXp, msgs);
    showToast(`🎉 ترقية! وصلت لـ لفل ${newLevel} — ${info.label}`);
  }
  if (currentProfile) currentProfile.xp = newXp;
  refreshMyLevelBadge(newXp, msgs);
}

// ── تحديث الـ badge بتاع المستخدم الحالي ─
function refreshMyLevelBadge(xp, msgs = 0) {
  document.querySelectorAll('.my-level-badge').forEach(el => {
    el.outerHTML = makeLevelBadge(xp, msgs, 28).replace('class="level-badge"', 'class="level-badge my-level-badge"');
  });
}

// ── مينيبوب عند الضغط على البادج ──────
function showLevelCard(userId) {
  // أزل أي popup موجود
  document.querySelector('.lv-mini-pop')?.remove();

  fetchUserStats(userId).then(({ xp, msgs }) => {
    const info = getLevelInfo(xp, msgs);
    const next = LEVELS.find(l => l.level === info.level + 1);

    let content;
    if (!next) {
      content = `<span class="lmp-done">🏆 أعلى مستوى!</span>`;
    } else {
      const neededXp  = next.xp   - xp;
      const neededMsg = next.msgs - msgs;
      const xpDone    = neededXp  <= 0;
      const msgDone   = neededMsg <= 0;
      content = `
        <span class="lmp-title">Lv.${info.level} ← Lv.${next.level}</span>
        <span class="lmp-row ${xpDone  ? 'done' : ''}">⚡ ${xpDone  ? 'XP مكتمل ✅'  : neededXp  + ' xp باقي'}</span>
        <span class="lmp-row ${msgDone ? 'done' : ''}">💬 ${msgDone ? 'رسائل مكتملة ✅' : neededMsg + ' رسالة باقي'}</span>`;
    }

    const pop = document.createElement('div');
    pop.className = 'lv-mini-pop';
    pop.innerHTML = content;
    document.body.appendChild(pop);

    // اختفاء تلقائي
    const hide = () => pop.remove();
    setTimeout(hide, 3000);
    pop.addEventListener('click', hide);
  });
}
