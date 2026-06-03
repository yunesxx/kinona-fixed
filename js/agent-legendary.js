// ══════════════════════════════════════
// LEGENDARY FEATURES — تطبيق الميزات الأسطورية
// ══════════════════════════════════════

// ── هالة النور: تطبق على عنصر أفاتار ──
function applyRadianceAura(avatarEl, color) {
  if (!avatarEl || !color) return;
  avatarEl.style.setProperty('box-shadow',
    `0 0 8px 3px ${color}, 0 0 18px 6px ${color}66`, 'important');
  avatarEl.style.setProperty('border-radius', '50%', 'important');
  avatarEl.classList.add('radiance-aura-active');
}

// ── النص المضيء: تطبق على فقاعة رسالة ──
function applyLuminousScript(msgBubble, color) {
  if (!msgBubble || !color) return;
  msgBubble.style.setProperty('box-shadow',
    `0 0 10px 2px ${color}55, inset 0 0 8px ${color}22`, 'important');
  msgBubble.style.setProperty('text-shadow',
    `0 0 8px ${color}99`, 'important');
}

// ── اللقب الملكي: حقن اللقب بجانب الاسم ──
function applyRoyalTitle(nameEl, title) {
  if (!nameEl || !title) return;
  nameEl.parentElement?.querySelectorAll('.cs-royal-title').forEach(e => e.remove());
  const span = document.createElement('span');
  span.className = 'cs-royal-title';
  span.textContent = title;
  nameEl.insertAdjacentElement('afterend', span);
}

// ── الظهور السينمائي: تشغيل الأنيميشن للمستلم ──
function triggerCinematicEntrance(avatarUrl, username, value = '#7b2ff7') {
  const isGif = typeof value === 'string' && value.startsWith('http');

  if (isGif) {
    // عرض GIF في منتصف الشات لمدة ثانية واحدة
    const chat = document.querySelector('#lounge-messages, .messages-list, .chat-messages, #chat-messages') || document.body;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:none;opacity:0;transition:opacity .15s ease;';
    if (chat !== document.body) chat.style.position = 'relative';
    wrap.innerHTML = `<img src="${value}" style="max-width:60%;max-height:60%;border-radius:12px;object-fit:contain;box-shadow:0 8px 32px rgba(0,0,0,.6);">`;
    chat.appendChild(wrap);
    requestAnimationFrame(() => { wrap.style.opacity = '1'; });
    setTimeout(() => {
      wrap.style.opacity = '0';
      setTimeout(() => wrap.remove(), 150);
    }, 1000);
  } else {
    const color = value;
    const overlay = document.createElement('div');
    overlay.className = 'cinematic-overlay';
    overlay.innerHTML = `
      <div class="cinematic-stage">
        <div class="cinematic-avatar" style="border-color:${color};box-shadow:0 0 40px ${color}88">
          ${avatarUrl
            ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : `<span style="font-size:48px;font-weight:900;color:#fff">${(username||'?')[0].toUpperCase()}</span>`}
        </div>
        <div class="cinematic-name" style="color:${color}">@${username}</div>
        <div class="cinematic-subtitle">أهدى إليك هدية أسطورية</div>
      </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('cinematic-show'), 30);
    setTimeout(() => {
      overlay.classList.remove('cinematic-show');
      setTimeout(() => overlay.remove(), 600);
    }, 3200);
  }
}

// ── إعلان الدخول الملكي (Royal Entrance Banner) ──
function showRoyalEntrance(username, title, avatarUrl) {
  document.querySelectorAll('.royal-entrance-banner').forEach(e => e.remove());
  const banner = document.createElement('div');
  banner.className = 'royal-entrance-banner';
  banner.innerHTML = `
    <div class="reb-avatar">
      ${avatarUrl
        ? `<img src="${avatarUrl}">`
        : `<span>${(username||'?')[0].toUpperCase()}</span>`}
    </div>
    <div class="reb-text">
      <span class="reb-title">${title}</span>
      <span class="reb-name">@${username} دخل الغرفة</span>
    </div>`;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('reb-show'), 30);
  setTimeout(() => {
    banner.classList.remove('reb-show');
    setTimeout(() => banner.remove(), 500);
  }, 3500);
}

// ── تطبيق الميزات الأسطورية على عنصر DOM ──
async function applyLegendaryToElement(userId, container, usernameSelector, avatarSelector) {
  if (!userId || !container) return;

  const [auraC, titleC, glowC] = await Promise.all([
    getUserCosmetic(userId, 'radiance_aura'),
    getUserCosmetic(userId, 'royal_title'),
    getUserCosmetic(userId, 'luminous_script'),
  ]);

  // هالة النور على الأفاتار
  if (auraC && avatarSelector) {
    const avEl = container.querySelector(avatarSelector);
    if (avEl) applyRadianceAura(avEl, auraC.value);
  }

  // اللقب الملكي
  if (titleC && usernameSelector) {
    const nameEl = container.querySelector(usernameSelector);
    if (nameEl) applyRoyalTitle(nameEl, titleC.value);
  }

  // النص المضيء على فقاعات الرسائل
  if (glowC) {
    container.querySelectorAll('.bub').forEach(bubble => {
      applyLuminousScript(bubble, glowC.value);
    });
  }
}

// ── جلب التفاعل الحصري لمستخدم ──
async function getSignatureReaction(userId) {
  const c = await getUserCosmetic(userId, 'signature_reaction');
  return c?.value || null;
}

// ══════════════════════════════════════
// 6. زر الوكيل في الـ UI
// ══════════════════════════════════════
async function initAgentButton() {
  _agentCache = null;
  const isAgent = await isCurrentUserAgent();
  const navBtn = document.getElementById('agent-fab');
  const profileBtn = document.getElementById('agent-fab-profile');
  const show = isAgent ? 'flex' : 'none';
  if (navBtn) navBtn.style.display = show;
  if (profileBtn) profileBtn.style.display = show;
}
