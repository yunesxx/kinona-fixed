// ══════════════════════════════════════
// 4. واجهة الوكيل — منح آيتم ليوزر
// ══════════════════════════════════════
async function openAgentPanel() {
  // افتح اللوحة فوراً بدون انتظار — نتحقق ونحدث الرصيد بالخلفية
  document.querySelector('.agent-panel')?.remove();

  const panel = document.createElement('div');
  panel.className = 'agent-panel';
  panel.innerHTML = `
    <div class="ap-sheet">

      <div class="ap-header">
        <span class="ap-title">🛡️ لوحة الوكيل</span>
        <button class="ap-close" onclick="this.closest('.agent-panel').remove()">✕</button>
      </div>

      <!-- رصيد النقاط -->
      <div class="ap-points-bar">
        <div class="ap-points-info">
          <span class="ap-points-label">💎 رصيدك</span>
          <strong id="ap-points-display">…</strong>
          <span class="ap-points-unit">نقطة</span>
        </div>
      </div>

      <!-- منح آيتم -->
      <div class="ap-section">
        <label class="ap-label">👤 المستخدم المستهدف</label>
        <div class="ap-search-row">
          <input class="ap-input" id="ap-username" placeholder="@username" autocomplete="off" enterkeyhint="search"/>
          <button class="ap-btn-search" onclick="agentSearchUser()">بحث</button>
        </div>
        <div id="ap-user-result" class="ap-user-result"></div>
      </div>

      <!-- فورم الآيتم -->
      <div class="ap-section" id="ap-form-wrap" style="display:none">
        <label class="ap-label">🎨 نوع الآيتم</label>
        <select class="ap-select" id="ap-type" onchange="agentUpdateFields()">
          ${Object.entries(COSMETIC_TYPES).map(([k,v]) =>
            `<option value="${k}">${v.icon} ${v.label}</option>`
          ).join('')}
        </select>

        <div id="ap-value-wrap"></div>

        <label class="ap-label" style="margin-top:12px">⚡ XP المطلوب من اليوزر</label>
        <input class="ap-input" id="ap-xp" type="number" min="0" placeholder="مثال: 500"/>

        <div class="ap-duration-note">⏱️ المدة: شهر واحد (تنتهي تلقائياً)</div>
        <div class="ap-points-cost" id="ap-cost-note"></div>

        <button class="ap-btn-apply" onclick="agentApplyCosmetic()">✅ تطبيق وخصم الـ XP</button>
      </div>

      <!-- إلغاء آيتم -->
      <div class="ap-section">
        <label class="ap-label">🗑️ إلغاء آيتم نشط</label>
        <div class="ap-search-row">
          <input class="ap-input" id="ap-revoke-username" placeholder="@username" autocomplete="off" enterkeyhint="search"/>
          <button class="ap-btn-search" onclick="agentRevokeSearch()">بحث</button>
        </div>
        <div id="ap-revoke-list"></div>
      </div>

    </div>
  `;
  document.body.appendChild(panel);
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });

  // Enter يطلق البحث + auto-focus + تحضير الفورم بالتوازي
  requestAnimationFrame(() => {
    agentUpdateFields();
    const u = document.getElementById('ap-username');
    const r = document.getElementById('ap-revoke-username');
    u?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agentSearchUser(); } });
    r?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agentRevokeSearch(); } });
    u?.focus();
  });

  // تحقق الصلاحية وتحميل الرصيد بالتوازي — اللوحة ظاهرة فوراً
  Promise.all([
    isCurrentUserAgent(),
    getAgentPoints(currentUser.id),
  ]).then(([isAgent, points]) => {
    if (!isAgent) {
      panel.remove();
      showToast('❌ أنت لست وكيلاً');
      return;
    }
    const disp = document.getElementById('ap-points-display');
    if (disp) disp.textContent = points;
  }).catch(err => {
    console.error('[Agent] فشل تحميل البيانات:', err);
    const disp = document.getElementById('ap-points-display');
    if (disp) disp.textContent = '0';
  });
}

// ══ طلب نقاط من الأدمن ══
async function agentRequestPoints() {
  const { data: admins } = await sb.from('profiles')
    .select('id').eq('is_admin', true).limit(5);

  if (!admins?.length) { showToast('❌ ما في أدمن متاح'); return; }

  const currentPoints = document.getElementById('ap-points-display')?.textContent || '0';
  const agentUsername = currentProfile?.username || currentUser?.id;

  for (const admin of admins) {
    const { error } = await sb.from('notifications').insert({
      user_id:        admin.id,
      actor_id:       currentUser.id,
      actor_username: agentUsername,
      actor_avatar:   currentProfile?.avatar_url || null,
      type:           'agent_points_request',
      body:           `🛡️ الوكيل @${agentUsername} يطلب شحن نقاط — رصيده الحالي: ${currentPoints} نقطة`,
      seen:           false,
      created_at:     new Date().toISOString(),
    });
    if (error) console.error('[Agent] فشل إرسال الطلب:', error.message);
  }
  showToast('✅ تم إرسال طلب النقاط للأدمن');
}

// ══ بحث عن يوزر ══
let _agentTargetUser = null;
const _agentUserCache = {}; // username (lower) → profile
let _agentSearchSeq = 0;    // لإلغاء النتائج القديمة
async function agentSearchUser() {
  const raw = document.getElementById('ap-username')?.value?.trim().replace('@','');
  if (!raw) return;
  const key = raw.toLowerCase();
  const res = document.getElementById('ap-user-result');
  const formWrap = document.getElementById('ap-form-wrap');
  const seq = ++_agentSearchSeq;

  const render = (data) => {
    if (seq !== _agentSearchSeq) return; // طلب أحدث أعطى نتيجة
    if (!data) {
      res.innerHTML = '<span class="ap-err">❌ اليوزر غير موجود</span>';
      if (formWrap) formWrap.style.display = 'none';
      _agentTargetUser = null;
      return;
    }
    _agentTargetUser = data;
    res.innerHTML = `
      <div class="ap-user-card">
        <div class="ap-user-av">${data.avatar_url
          ? `<img src="${data.avatar_url}" loading="lazy">`
          : (data.username||'?')[0].toUpperCase()}</div>
        <div>
          <div class="ap-user-name">${data.display_name || data.username}</div>
          <div class="ap-user-xp">⚡ ${data.xp || 0} XP</div>
        </div>
      </div>`;
    if (formWrap) formWrap.style.display = 'block';
    agentUpdateFields();
  };

  // عرض فوري من الـ cache (لو موجود) — refresh في الخلفية
  if (Object.prototype.hasOwnProperty.call(_agentUserCache, key)) {
    render(_agentUserCache[key]);
  } else {
    res.innerHTML = '<span class="ap-loading">...</span>';
  }

  const { data } = await sb.from('profiles')
    .select('id,username,display_name,avatar_url,xp')
    .ilike('username', raw).maybeSingle();
  _agentUserCache[key] = data || null;
  render(data);
}

// ══ تحديث حقل القيمة حسب النوع ══
function agentUpdateFields() {
  const type = document.getElementById('ap-type')?.value;
  const wrap = document.getElementById('ap-value-wrap');
  const costNote = document.getElementById('ap-cost-note');
  if (!wrap) return;

  // عرض تكلفة الآيتم
  if (costNote && type) {
    const price = COSMETIC_PRICES[type] || 0;
    costNote.textContent = `💎 تكلفة هذا الآيتم: ${price} نقطة من رصيدك`;
  }

  if (type === 'username_color' || type === 'avatar_border') {
    wrap.innerHTML = `
      <label class="ap-label">اللون (hex)</label>
      <div class="ap-color-row">
        <input type="color" class="ap-color-picker" id="ap-color-pick" value="#ff6b35"
          oninput="document.getElementById('ap-color-hex').value=this.value"/>
        <input class="ap-input" id="ap-color-hex" placeholder="#ff6b35" value="#ff6b35"
          oninput="document.getElementById('ap-color-pick').value=this.value||'#ff6b35'"/>
      </div>`;
  } else if (type === 'username_gradient' || (type === 'avatar_border')) {
    wrap.innerHTML = `
      <label class="ap-label">Gradient CSS (مثال: linear-gradient(90deg,#ff6b35,#ffd54f))</label>
      <input class="ap-input" id="ap-gradient-val" placeholder="linear-gradient(90deg,#ff6b35,#ffd54f)"/>
      <div class="ap-grad-preview" id="ap-grad-prev"></div>`;
    document.getElementById('ap-gradient-val')?.addEventListener('input', e => {
      const prev = document.getElementById('ap-grad-prev');
      if (prev) prev.style.background = e.target.value;
    });
  } else if (type === 'badge') {
    wrap.innerHTML = `
      <label class="ap-label">اختر الشارة</label>
      <div class="ap-badges-grid">
        ${['VIP','Legend','Pro','Star','Elite','Champion','GOD','Veteran'].map(b =>
          `<button class="ap-badge-opt" onclick="agentSelectBadge('${b}',this)">${b}</button>`
        ).join('')}
      </div>
      <input class="ap-input" id="ap-badge-custom" placeholder="أو اكتب شارة مخصصة..." style="margin-top:8px"/>`;
  } else if (type === 'flair') {
    wrap.innerHTML = `
      <label class="ap-label">نص الـ Flair (حر)</label>
      <input class="ap-input" id="ap-flair-val" placeholder="مثال: 🎭 المميز" maxlength="20"/>`;
  } else if (type === 'cinematic_gift') {
    wrap.innerHTML = `
      <label class="ap-label">🎬 الظهور السينمائي</label>
      <div class="ap-legend-desc">عند دخولك الغرفة يظهر GIF في منتصف الشات لجميع أفراد الغرفة.</div>
      <label class="ap-label" style="margin-top:8px">رابط GIF الترحيب</label>
      <input type="text" id="ap-cinematic-url" class="ap-input" placeholder="مثال: https://media.giphy.com/..." style="margin-top:6px;" oninput="apCinematicPreview(this)"/>
      <div id="ap-cinematic-status" style="font-size:12px;color:#aaa;margin-top:6px;"></div>
      <img id="ap-cinematic-vid" style="display:none;width:100%;border-radius:10px;margin-top:8px;max-height:140px;object-fit:contain;" />`;
    window.apCinematicPreview = (input) => {
      const url = input.value.trim();
      const img = document.getElementById('ap-cinematic-vid');
      const status = document.getElementById('ap-cinematic-status');
      if (!url) { img.style.display = 'none'; status.textContent = ''; return; }
      img.src = url;
      img.style.display = 'block';
      status.textContent = '✅ معاينة';
    };
  } else if (type === 'radiance_aura') {
    wrap.innerHTML = `
      <label class="ap-label">💫 هالة النور</label>
      <div class="ap-legend-desc">إضاءة نيون نابضة تحيط بصورة المستخدم في كل مكان — الشات، قائمة المتصلين، البروفايل.</div>
      <label class="ap-label" style="margin-top:8px">لون الهالة</label>
      <div class="ap-color-row">
        <input type="color" class="ap-color-picker" id="ap-color-pick" value="#c084fc"
          oninput="document.getElementById('ap-color-hex').value=this.value"/>
        <input class="ap-input" id="ap-color-hex" placeholder="#c084fc" value="#c084fc"
          oninput="document.getElementById('ap-color-pick').value=this.value||'#c084fc'"/>
      </div>
      <div class="ap-aura-preview" id="ap-aura-prev"></div>`;
    setTimeout(() => {
      const hex = document.getElementById('ap-color-hex')?.value || '#c084fc';
      const prev = document.getElementById('ap-aura-prev');
      if (prev) prev.style.boxShadow = `0 0 12px 4px ${hex}, 0 0 24px 8px ${hex}44`;
      document.getElementById('ap-color-hex')?.addEventListener('input', e => {
        if (prev) prev.style.boxShadow = `0 0 12px 4px ${e.target.value}, 0 0 24px 8px ${e.target.value}44`;
      });
    }, 50);
  } else if (type === 'royal_title') {
    wrap.innerHTML = `
      <label class="ap-label">👑 اللقب الملكي</label>
      <div class="ap-legend-desc">لقب فخم بجانب الاسم + عند دخول الغرفة يظهر شريط إعلان Glassmorphism بأسلوب القادة.</div>
      <div class="ap-badges-grid" style="margin-top:6px">
        ${['The Founder','Prime Agent','Shadow King','Iron Lord','Grand Master','The Legend'].map(t =>
          `<button class="ap-badge-opt" onclick="agentSelectTitle('${t}',this)">${t}</button>`
        ).join('')}
      </div>
      <input class="ap-input" id="ap-title-val" placeholder="أو اكتب لقباً مخصصاً..." style="margin-top:8px" maxlength="30"/>`;
  } else if (type === 'luminous_script') {
    wrap.innerHTML = `
      <label class="ap-label">💡 النص المضيء</label>
      <div class="ap-legend-desc">رسائل المستخدم تظهر بتوهج خلفي (Backlit) يجعل كلامه الأكثر وضوحاً في الشات.</div>
      <label class="ap-label" style="margin-top:8px">لون التوهج</label>
      <div class="ap-color-row">
        <input type="color" class="ap-color-picker" id="ap-color-pick" value="#ffd700"
          oninput="document.getElementById('ap-color-hex').value=this.value"/>
        <input class="ap-input" id="ap-color-hex" placeholder="#ffd700" value="#ffd700"
          oninput="document.getElementById('ap-color-pick').value=this.value||'#ffd700'"/>
      </div>`;
  } else if (type === 'signature_reaction') {
    wrap.innerHTML = `
      <label class="ap-label">💎 التفاعل الحصري</label>
      <div class="ap-legend-desc">بدلاً من القلب العادي، يراه الجميع عند تفاعل هذا المستخدم — جوهرة، ختم ذهبي، أو رمز مخصص.</div>
      <label class="ap-label" style="margin-top:8px">اختر الرمز الحصري</label>
      <div class="ap-badges-grid">
        ${['💎','👑','⚡','🔥','🌟','🏆','💫','🎯'].map(r =>
          `<button class="ap-badge-opt ap-reaction-opt" onclick="agentSelectReaction('${r}',this)" style="font-size:20px;padding:8px 12px">${r}</button>`
        ).join('')}
      </div>
      <input class="ap-input" id="ap-reaction-val" placeholder="أو أدخل إيموجي مخصص..." style="margin-top:8px" maxlength="4"/>`;
  } else if (type === 'bubble_style') {
    wrap.innerHTML = `
      <label class="ap-label">💬 ستايل الفقاعة</label>
      <div class="ap-legend-desc">يظهر اسم المستخدم الإنجليزي فوق كل رسالة، مع تخصيص لون الفقاعة والكتابة والإطار.</div>
      <label class="ap-label" style="margin-top:8px">لون الفقاعة (الخلفية)</label>
      <div class="ap-color-row">
        <input type="color" class="ap-color-picker" id="ap-bub-bg-pick" value="#1e1e2e"
          oninput="document.getElementById('ap-bub-bg').value=this.value"/>
        <input class="ap-input" id="ap-bub-bg" placeholder="#1e1e2e" value="#1e1e2e"
          oninput="document.getElementById('ap-bub-bg-pick').value=this.value||'#1e1e2e'"/>
      </div>
      <label class="ap-label" style="margin-top:8px">لون الكتابة</label>
      <div class="ap-color-row">
        <input type="color" class="ap-color-picker" id="ap-bub-text-pick" value="#ffffff"
          oninput="document.getElementById('ap-bub-text').value=this.value"/>
        <input class="ap-input" id="ap-bub-text" placeholder="#ffffff" value="#ffffff"
          oninput="document.getElementById('ap-bub-text-pick').value=this.value||'#ffffff'"/>
      </div>
      <label class="ap-label" style="margin-top:8px">لون الإطار / الوهج</label>
      <div class="ap-color-row">
        <input type="color" class="ap-color-picker" id="ap-bub-border-pick" value="#7b2ff7"
          oninput="document.getElementById('ap-bub-border').value=this.value"/>
        <input class="ap-input" id="ap-bub-border" placeholder="#7b2ff7" value="#7b2ff7"
          oninput="document.getElementById('ap-bub-border-pick').value=this.value||'#7b2ff7'"/>
      </div>`;
  }
}

// ══ اختيار badge جاهزة ══
function agentSelectBadge(name, btn) {
  document.querySelectorAll('.ap-badge-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const custom = document.getElementById('ap-badge-custom');
  if (custom) custom.value = name;
}

// ══ اختيار لقب ملكي ══
function agentSelectTitle(name, btn) {
  document.querySelectorAll('.ap-badge-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const input = document.getElementById('ap-title-val');
  if (input) input.value = name;
}

// ══ اختيار تفاعل حصري ══
function agentSelectReaction(emoji, btn) {
  document.querySelectorAll('.ap-reaction-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const input = document.getElementById('ap-reaction-val');
  if (input) input.value = emoji;
}

// ══ تطبيق الآيتم ══
async function agentApplyCosmetic() {
  if (!_agentTargetUser) { showToast('❌ ابحث عن يوزر أولاً'); return; }

  const type  = document.getElementById('ap-type')?.value;
  const xpCost = parseInt(document.getElementById('ap-xp')?.value || '0');

  // استخراج القيمة حسب النوع
  let value = '';
  if (type === 'username_color') {
    value = document.getElementById('ap-color-hex')?.value?.trim() || '#ff6b35';
  } else if (type === 'username_gradient') {
    value = document.getElementById('ap-gradient-val')?.value?.trim();
  } else if (type === 'avatar_border') {
    value = document.getElementById('ap-color-hex')?.value?.trim()
         || document.getElementById('ap-gradient-val')?.value?.trim()
         || '#ff6b35';
  } else if (type === 'badge') {
    value = document.getElementById('ap-badge-custom')?.value?.trim()
         || document.querySelector('.ap-badge-opt.selected')?.textContent?.trim();
  } else if (type === 'flair') {
    value = document.getElementById('ap-flair-val')?.value?.trim();
  } else if (type === 'cinematic_gift') {
    value = document.getElementById('ap-cinematic-url')?.value?.trim();
    if (!value) { showToast('أدخل رابط GIF أولاً'); return; }
  } else if (type === 'radiance_aura') {
    value = document.getElementById('ap-color-hex')?.value?.trim() || '#c084fc';
  } else if (type === 'royal_title') {
    value = document.getElementById('ap-title-val')?.value?.trim()
         || document.querySelector('.ap-badge-opt.selected')?.textContent?.trim();
  } else if (type === 'luminous_script') {
    value = document.getElementById('ap-color-hex')?.value?.trim() || '#ffd700';
  } else if (type === 'signature_reaction') {
    value = document.getElementById('ap-reaction-val')?.value?.trim()
         || document.querySelector('.ap-reaction-opt.selected')?.textContent?.trim();
  } else if (type === 'bubble_style') {
    const bg     = document.getElementById('ap-bub-bg')?.value?.trim()     || '#1e1e2e';
    const text   = document.getElementById('ap-bub-text')?.value?.trim()   || '#ffffff';
    const border = document.getElementById('ap-bub-border')?.value?.trim() || '#7b2ff7';
    value = `${bg}|${text}|${border}`;
  }

  if (!value) { showToast('❌ أدخل قيمة الآيتم'); return; }

  // تحقق متوازي: نقاط الوكيل + XP اليوزر
  const itemCost = COSMETIC_PRICES[type] || 0;
  const [agentPoints, profileResult] = await Promise.all([
    getAgentPoints(currentUser.id),
    sb.from('profiles').select('xp').eq('id', _agentTargetUser.id).single(),
  ]);
  if (agentPoints < itemCost) {
    showToast(`❌ رصيدك غير كافٍ (عندك ${agentPoints} نقطة، الآيتم يحتاج ${itemCost})`);
    return;
  }
  const userXp = profileResult?.data?.xp || 0;
  if (xpCost > 0 && userXp < xpCost) {
    showToast(`❌ اليوزر ما عنده XP كافي (عنده ${userXp})`);
    return;
  }

  const btn = document.querySelector('.ap-btn-apply');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  // تحديث متفائل للرصيد قبل اكتمال الـ network
  const newPoints = agentPoints - itemCost;
  const display = document.getElementById('ap-points-display');
  if (display) display.textContent = newPoints;

  try {
    const expiresAt = new Date(Date.now() + COSMETIC_DURATION_DAYS * 86400000).toISOString();

    // delete القديم ثم insert الجديد (الترتيب مطلوب لتجنب duplicate)
    await sb.from('user_cosmetics')
      .delete()
      .eq('user_id', _agentTargetUser.id)
      .eq('type', type);

    // insert + خصم النقاط + خصم XP بالتوازي
    const writes = [
      sb.from('user_cosmetics').insert({
        user_id:    _agentTargetUser.id,
        agent_id:   currentUser.id,
        type,
        value,
        xp_paid:    xpCost,
        expires_at: expiresAt,
      }),
      sb.from('agent_points')
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('agent_id', currentUser.id),
    ];
    if (xpCost > 0) {
      writes.push(sb.from('profiles').update({ xp: userXp - xpCost }).eq('id', _agentTargetUser.id));
    }
    const results = await Promise.all(writes);
    const insertErr = results[0]?.error;
    if (insertErr) throw insertErr;

    clearCosmeticsCache(_agentTargetUser.id);
    showToast(`✅ تم تطبيق ${COSMETIC_TYPES[type]?.label} على @${_agentTargetUser.username}`);

    // reset form
    document.getElementById('ap-user-result').innerHTML = '';
    document.getElementById('ap-form-wrap').style.display = 'none';
    document.getElementById('ap-username').value = '';
    document.getElementById('ap-xp').value = '';
    _agentTargetUser = null;

  } catch(e) {
    showToast('❌ فشل التطبيق: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ تطبيق وخصم الـ XP'; }
  }
}

// ══ بحث آيتمات يوزر لإلغائها ══
let _agentRevokeSeq = 0;
async function agentRevokeSearch() {
  const username = document.getElementById('ap-revoke-username')?.value?.trim().replace('@','');
  if (!username) return;
  const list = document.getElementById('ap-revoke-list');
  list.innerHTML = '<span class="ap-loading">...</span>';
  const seq = ++_agentRevokeSeq;

  const { data: profile } = await sb.from('profiles')
    .select('id,username').ilike('username', username).maybeSingle();
  if (seq !== _agentRevokeSeq) return;
  if (!profile) { list.innerHTML = '<span class="ap-err">❌ اليوزر غير موجود</span>'; return; }

  const now = new Date().toISOString();
  const { data: cosmetics } = await sb.from('user_cosmetics')
    .select('*').eq('user_id', profile.id).gt('expires_at', now);
  if (seq !== _agentRevokeSeq) return;

  if (!cosmetics?.length) {
    list.innerHTML = '<span class="ap-err">لا يوجد آيتمات نشطة</span>';
    return;
  }

  list.innerHTML = cosmetics.map(c => {
    const exp = new Date(c.expires_at).toLocaleDateString('ar-SA');
    const typeInfo = COSMETIC_TYPES[c.type] || { label: c.type, icon: '?' };
    return `<div class="ap-revoke-item">
      <span>${typeInfo.icon} ${typeInfo.label}</span>
      <span class="ap-revoke-exp">ينتهي ${exp}</span>
      <button class="ap-btn-revoke" onclick="agentRevoke('${c.id}','${profile.id}',this)">إلغاء</button>
    </div>`;
  }).join('');
}

// ══ إلغاء آيتم (تحديث متفائل) ══
async function agentRevoke(cosmeticId, userId, btn) {
  const item = btn.closest('.ap-revoke-item');
  btn.disabled = true;
  // إخفاء فوري — استرجاع لو فشل
  if (item) item.style.opacity = '0.4';
  clearCosmeticsCache(userId);

  const { error } = await sb.from('user_cosmetics').delete().eq('id', cosmeticId);
  if (error) {
    if (item) item.style.opacity = '1';
    btn.disabled = false;
    showToast('❌ فشل الإلغاء');
    return;
  }
  item?.remove();
  showToast('✅ تم إلغاء الآيتم');
}

