// ══════════════════════════════════════
// 5. أدمن — تعيين/إزالة وكيل
// ══════════════════════════════════════
async function adminToggleAgent(userId, username) {
  const { data: existing } = await sb.from('agents')
    .select('id').eq('user_id', userId).maybeSingle();

  if (existing) {
    await sb.from('agents').delete().eq('user_id', userId);
    await sb.from('profiles').update({ is_agent: false }).eq('id', userId);
    showToast(`❌ تم إزالة @${username} من الوكلاء`);
  } else {
    await sb.from('agents').insert({ user_id: userId });
    await sb.from('profiles').update({ is_agent: true }).eq('id', userId);
    showToast(`✅ تم تعيين @${username} كوكيل`);
  }
  _agentCache = null; // reset cache
}

// ══ شحن نقاط وكيل (للأدمن) ══
async function adminChargeAgentPoints(agentId, username) {
  // يدعم input من لوحة الأدمن (charge-input-) أو من طلبات النقاط (req-pts-)
  const input = document.getElementById(`charge-input-${agentId}`)
             || document.getElementById(`req-pts-${agentId}`);
  const amount = parseInt(input?.value || '0');
  if (!amount || amount <= 0) { showToast('❌ أدخل عدد صحيح'); return; }

  const btn = input?.nextElementSibling;
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    const { data: existing, error: fetchErr } = await sb.from('agent_points')
      .select('id,points').eq('agent_id', agentId).maybeSingle();

    if (fetchErr) throw fetchErr;

    let writeErr;
    if (existing) {
      // row موجود → update
      const { error } = await sb.from('agent_points')
        .update({ points: existing.points + amount, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId);
      writeErr = error;
    } else {
      // row جديد → insert
      const { error } = await sb.from('agent_points')
        .insert({ agent_id: agentId, points: amount });
      writeErr = error;
    }

    if (writeErr) throw writeErr;
    const newTotal = (existing?.points || 0) + amount;

    showToast(`✅ تم شحن ${amount} نقطة لـ @${username} (الرصيد: ${newTotal})`);
    const badge = document.getElementById(`points-badge-${agentId}`);
    if (badge) badge.textContent = `🛡️ وكيل — 💎 ${newTotal} نقطة`;
    if (input) input.value = '';
  } catch(e) {
    showToast('❌ فشل الشحن: ' + e.message);
    console.error('charge error:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '💎 شحن'; }
  }
}

// ══ عرض طلبات النقاط في الأدمن ══
async function adminLoadPointsRequests() {
  const container = document.getElementById('admin-points-requests');
  if (!container) return;
  container.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,.4)">جاري التحميل...</span>';

  const { data } = await sb.from('notifications')
    .select('id,body,actor_id,created_at,seen')
    .eq('type', 'agent_points_request')
    .eq('seen', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data?.length) {
    container.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,.3)">لا يوجد طلبات</span>';
    return;
  }

  // جلب usernames
  const actorIds = [...new Set(data.map(n => n.actor_id))];
  const { data: profiles } = await sb.from('profiles')
    .select('id,username,display_name').in('id', actorIds);
  const profileMap = Object.fromEntries((profiles||[]).map(p => [p.id, p]));

  container.innerHTML = data.map(n => {
    const p = profileMap[n.actor_id];
    const name = p?.display_name || p?.username || '؟';
    const date = new Date(n.created_at).toLocaleDateString('ar-SA');
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:#fff">@${p?.username || '؟'} — ${name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4)">${date}</div>
        </div>
        <div style="display:flex;gap:6px">
          <input id="req-pts-${n.actor_id}" type="number" min="1" placeholder="نقاط"
            style="width:70px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
                   border-radius:8px;padding:6px 8px;color:#fff;font-family:'Tajawal',sans-serif;font-size:12px;outline:none"/>
          <button onclick="adminChargeAgentPoints('${n.actor_id}','${p?.username||''}');adminMarkRequestSeen('${n.id}')"
            class="acp-btn acp-btn-primary" style="width:auto;padding:0 12px;margin:0;font-size:12px">
            💎 شحن
          </button>
          <button onclick="adminMarkRequestSeen('${n.id}');this.closest('div[style]').remove()"
            class="acp-btn acp-btn-dark" style="width:auto;padding:0 10px;margin:0;font-size:12px">
            ✓
          </button>
        </div>
      </div>`;
  }).join('');
}

async function adminMarkRequestSeen(notifId) {
  await sb.from('notifications').update({ seen: true }).eq('id', notifId);
}

// ══ إرسال نقاط مباشر من الأدمن ══
async function adminSendPointsSearch() {
  const username = document.getElementById('admin-send-pts-username')?.value?.trim().replace('@','');
  if (!username) return;
  const res = document.getElementById('admin-send-pts-result');
  res.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,.4)">...</span>';

  const { data } = await sb.from('profiles')
    .select('id,username,display_name,avatar_url,is_agent').ilike('username', username).maybeSingle();

  if (!data) { res.innerHTML = '<span style="color:#f66;font-size:13px">❌ غير موجود</span>'; return; }
  if (!data.is_agent) { res.innerHTML = '<span style="color:#f66;font-size:13px">❌ هذا المستخدم ليس وكيلاً</span>'; return; }

  const currentPts = await getAgentPoints(data.id);

  res.innerHTML = `
    <div class="ap-user-card" style="margin-top:8px;flex-wrap:wrap;gap:8px">
      <div class="ap-user-av">${data.avatar_url ? `<img src="${data.avatar_url}">` : (data.username||'?')[0].toUpperCase()}</div>
      <div style="flex:1">
        <div class="ap-user-name">${data.display_name || data.username}</div>
        <div class="ap-user-xp" id="send-pts-badge-${data.id}">💎 رصيده: ${currentPts} نقطة</div>
      </div>
      <div style="display:flex;gap:6px;width:100%;margin-top:4px">
        <input id="send-pts-amount-${data.id}" class="ap-input" type="number" min="1" placeholder="عدد النقاط" style="flex:1;margin:0"/>
        <button onclick="adminSendPoints('${data.id}','${data.username}')"
          class="acp-btn acp-btn-primary" style="width:auto;padding:0 18px;margin:0;flex-shrink:0">
          💎 إرسال
        </button>
      </div>
    </div>`;
}

async function adminSendPoints(agentId, username) {
  const input = document.getElementById(`send-pts-amount-${agentId}`);
  const amount = parseInt(input?.value || '0');
  if (!amount || amount <= 0) { showToast('❌ أدخل عدد صحيح'); return; }

  const btn = input?.nextElementSibling;
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    const { data: existing } = await sb.from('agent_points')
      .select('id,points').eq('agent_id', agentId).maybeSingle();

    let writeErr;
    if (existing) {
      const { error } = await sb.from('agent_points')
        .update({ points: existing.points + amount, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId);
      writeErr = error;
    } else {
      const { error } = await sb.from('agent_points')
        .insert({ agent_id: agentId, points: amount });
      writeErr = error;
    }

    if (writeErr) throw writeErr;

    const newTotal = (existing?.points || 0) + amount;
    showToast(`✅ تم إرسال ${amount} نقطة لـ @${username} (الرصيد: ${newTotal})`);
    const badge = document.getElementById(`send-pts-badge-${agentId}`);
    if (badge) badge.textContent = `💎 رصيده: ${newTotal} نقطة`;
    if (input) input.value = '';
  } catch(e) {
    showToast('❌ فشل الإرسال: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '💎 إرسال'; }
  }
}

// ══ بحث في الأدمن لتعيين وكيل ══
async function adminAgentSearch() {
  const username = document.getElementById('admin-agent-search')?.value?.trim().replace('@','');
  if (!username) return;
  const res = document.getElementById('admin-agent-result');
  res.innerHTML = '...';

  const { data } = await sb.from('profiles')
    .select('id,username,display_name,avatar_url,is_agent').ilike('username', username).maybeSingle();

  if (!data) { res.innerHTML = '<span style="color:#f66">❌ غير موجود</span>'; return; }

  const isAgent = data.is_agent;
  const points = isAgent ? await getAgentPoints(data.id) : 0;

  res.innerHTML = `
    <div class="ap-user-card" style="margin-top:8px;flex-wrap:wrap;gap:8px">
      <div class="ap-user-av">${data.avatar_url
        ? `<img src="${data.avatar_url}">`
        : (data.username||'?')[0].toUpperCase()}</div>
      <div style="flex:1">
        <div class="ap-user-name">${data.display_name || data.username}</div>
        <div class="ap-user-xp" id="points-badge-${data.id}">${isAgent ? `🛡️ وكيل — 💎 ${points} نقطة` : '👤 مستخدم عادي'}</div>
      </div>
      <button class="ap-btn-${isAgent ? 'revoke' : 'apply'}"
        onclick="adminToggleAgent('${data.id}','${data.username}');this.closest('.ap-user-card').remove()">
        ${isAgent ? '❌ إزالة' : '✅ تعيين وكيل'}
      </button>
      ${isAgent ? `
      <div style="display:flex;gap:6px;width:100%;margin-top:4px">
        <input id="charge-input-${data.id}" class="ap-input" type="number" min="1" placeholder="عدد النقاط" style="flex:1;margin:0"/>
        <button class="ap-btn-apply" style="padding:0 14px;margin:0"
          onclick="adminChargeAgentPoints('${data.id}','${data.username}')">💎 شحن</button>
      </div>` : ''}
    </div>`;
}

