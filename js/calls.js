// ══════════════════════════════════════
// CALLS — WebRTC مكالمات صوتية وفيديو
// Signaling عبر Supabase Realtime Broadcast
// ══════════════════════════════════════

let callChannel      = null;
let localStream      = null;
let remoteStream     = null;
let peerConnection   = null;
let callType         = null;
let callState        = 'idle';
let callPartner      = null;
let callTimer        = null;
let callSeconds      = 0;
let isCallInitiator  = false;
let _globalCallCh    = null;
let _micMuted        = false;
let _camOff          = false;

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

function _callChId(a, b) { return 'call_' + [a, b].sort().join('_'); }

function _joinCallChannel(partnerId) {
  if (callChannel) { try { sb.removeChannel(callChannel); } catch(e){} callChannel = null; }
  callChannel = sb.channel(_callChId(currentUser.id, partnerId))
    .on('broadcast', { event: 'call_signal' }, ({ payload }) => _handleSignal(payload))
    .subscribe();
}

async function _sendSignal(type, extra = {}) {
  if (!callChannel) return;
  await callChannel.send({
    type: 'broadcast',
    event: 'call_signal',
    payload: { type, from: currentUser.id, ...extra }
  });
}

async function startVoiceCall() { if (activeChat) await _initiateCall('audio', activeChat); }
async function startVideoCall() { if (activeChat) await _initiateCall('video', activeChat); }

async function _initiateCall(type, partner) {
  if (callState !== 'idle') { showToast('أنت في مكالمة بالفعل'); return; }
  callType = type; callPartner = partner; isCallInitiator = true; callState = 'calling';
  _showCallUI('outgoing');

  try {
    localStream = await navigator.mediaDevices.getUserMedia(
      type === 'video' ? { audio: true, video: true } : { audio: true }
    );
    _attachLocal();
  } catch(e) {
    showToast('تعذّر الوصول إلى الميكروفون أو الكاميرا');
    _cleanup(); return;
  }

  _joinCallChannel(partner.id);
  _createPC();

  const inCh = sb.channel('incoming_' + partner.id).subscribe();
  setTimeout(async () => {
    await inCh.send({
      type: 'broadcast', event: 'call_request',
      payload: {
        callType: type, from: currentUser.id, to: partner.id,
        callerName:   currentProfile?.display_name || currentProfile?.username || '',
        callerAvatar: currentProfile?.avatar_url || null,
      }
    });
    setTimeout(() => { try { sb.removeChannel(inCh); } catch(e){} }, 2000);
  }, 400);

  window._callTO = setTimeout(() => {
    if (callState === 'calling') { showToast('لا يوجد رد'); _cleanup(); }
  }, 40000);
}

async function _handleSignal(p) {
  if (p.from === currentUser.id) return;
  switch (p.type) {

    case 'accepted': {
      if (callState !== 'calling') return;
      clearTimeout(window._callTO);
      callState = 'active';
      _showCallUI('active');
      await _sendOffer();
      break;
    }

    case 'rejected': {
      clearTimeout(window._callTO);
      showToast(p.reason === 'busy' ? 'المستخدم مشغول' : 'رُفضت المكالمة');
      _cleanup(); break;
    }

    case 'ended': {
      if (callState !== 'idle') showToast('انتهت المكالمة');
      _cleanup(); break;
    }

    case 'webrtc_offer': {
      if (!peerConnection) _createPC();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(p.sdp));
      if (!localStream) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia(
            callType === 'video' ? { audio: true, video: true } : { audio: true }
          );
          _attachLocal();
        } catch(e) { showToast('تعذّر الوصول للميكروفون أو الكاميرا'); _cleanup(); return; }
      }
      localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
      const ans = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(ans);
      await _sendSignal('webrtc_answer', { sdp: peerConnection.localDescription });
      callState = 'active'; _showCallUI('active'); _startTimer();
      break;
    }

    case 'webrtc_answer': {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(p.sdp));
      _startTimer(); break;
    }

    case 'ice_candidate': {
      if (peerConnection && p.candidate) {
        try { await peerConnection.addIceCandidate(new RTCIceCandidate(p.candidate)); } catch(e){}
      }
      break;
    }
  }
}

async function acceptCall() {
  if (callState !== 'receiving') return;
  callState = 'active';
  try {
    localStream = await navigator.mediaDevices.getUserMedia(
      callType === 'video' ? { audio: true, video: true } : { audio: true }
    );
    _attachLocal();
  } catch(e) { showToast('تعذّر الوصول للميكروفون أو الكاميرا'); _cleanup(); return; }
  _createPC();
  await _sendSignal('accepted', { to: callPartner.id });
  _showCallUI('active');
}

async function rejectCall() {
  await _sendSignal('rejected', { to: callPartner?.id });
  _cleanup();
}

async function endCall() {
  await _sendSignal('ended', { to: callPartner?.id });
  _cleanup();
}

function _createPC() {
  if (peerConnection) { try { peerConnection.close(); } catch(e){} }
  peerConnection = new RTCPeerConnection(RTC_CONFIG);
  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) _sendSignal('ice_candidate', { candidate });
  };
  peerConnection.ontrack = ({ streams }) => {
    if (!streams?.[0]) return;
    remoteStream = streams[0];
    const rv = document.getElementById('call-remote-video');
    const ra = document.getElementById('call-remote-audio');
    if (rv) rv.srcObject = remoteStream;
    if (ra) ra.srcObject = remoteStream;
  };
  peerConnection.onconnectionstatechange = () => {
    if (peerConnection?.connectionState === 'failed') { showToast('انقطع الاتصال'); _cleanup(); }
  };
}

async function _sendOffer() {
  localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  await _sendSignal('webrtc_offer', { sdp: peerConnection.localDescription });
}

function _attachLocal() {
  const lv = document.getElementById('call-local-video');
  if (lv && localStream) lv.srcObject = localStream;
}

function _startTimer() {
  callSeconds = 0;
  callTimer = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const s = String(callSeconds % 60).padStart(2, '0');
    const el = document.getElementById('call-timer');
    if (el) el.textContent = m + ':' + s;
  }, 1000);
}

function _stopTimer() {
  if (callTimer) { clearInterval(callTimer); callTimer = null; }
  callSeconds = 0;
}

function toggleMic() {
  if (!localStream) return;
  _micMuted = !_micMuted;
  localStream.getAudioTracks().forEach(t => t.enabled = !_micMuted);
  const btn = document.getElementById('call-btn-mic');
  if (btn) { btn.classList.toggle('call-btn-off', _micMuted); btn.innerHTML = _micMuted ? _ico_micOff() : _ico_mic(); }
}

function toggleCam() {
  if (!localStream) return;
  _camOff = !_camOff;
  localStream.getVideoTracks().forEach(t => t.enabled = !_camOff);
  const btn = document.getElementById('call-btn-cam');
  if (btn) { btn.classList.toggle('call-btn-off', _camOff); btn.innerHTML = _camOff ? _ico_camOff() : _ico_cam(); }
}

function _cleanup() {
  clearTimeout(window._callTO);
  _stopTimer();
  if (localStream)    { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (peerConnection) { try { peerConnection.close(); } catch(e){} peerConnection = null; }
  if (callChannel)    { try { sb.removeChannel(callChannel); } catch(e){} callChannel = null; }
  callState = 'idle'; callPartner = null; callType = null;
  isCallInitiator = false; _micMuted = false; _camOff = false;
  _hideCallUI();
}

function _btnStyle(bg, sh) {
  return 'width:65px;height:65px;border-radius:50%;background:' + bg + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ' + sh + ';';
}
function _btnStyleSm() {
  return 'width:55px;height:55px;border-radius:50%;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.2);cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);';
}

function _showCallUI(mode) {
  let ov = document.getElementById('call-overlay');
  if (!ov) { ov = document.createElement('div'); ov.id = 'call-overlay'; document.body.appendChild(ov); }

  const partner  = callPartner;
  const name     = partner?.display_name || partner?.username || 'مستخدم';
  const isVideo  = callType === 'video';
  const isActive = mode === 'active';
  const isIn     = mode === 'incoming';
  const isOut    = mode === 'outgoing';

  const av = partner?.avatar_url
    ? '<img src="' + partner.avatar_url + '" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.3);">'
    : '<div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#ff6b35,#ff416c);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;color:#fff;border:3px solid rgba(255,255,255,.3);">' + (name[0]||'?').toUpperCase() + '</div>';

  const statusText = isOut ? (isVideo ? '📹 مكالمة فيديو صادرة…' : '📞 جاري الاتصال…')
                   : isIn  ? (isVideo ? '📹 مكالمة فيديو واردة'  : '📞 مكالمة صوتية واردة')
                   : '';

  const bg = (isActive && isVideo) ? 'background:#000' : 'background:linear-gradient(160deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)';

  ov.innerHTML =
    '<div style="position:fixed;inset:0;z-index:99999;' + bg + ';display:flex;flex-direction:column;align-items:center;justify-content:' + (isActive && isVideo ? 'flex-start' : 'center') + ';font-family:inherit;">' +

    (isActive && isVideo
      ? '<video id="call-remote-video" autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;"></video>' +
        '<video id="call-local-video"  autoplay playsinline muted style="position:absolute;bottom:120px;right:16px;width:90px;height:120px;border-radius:14px;object-fit:cover;background:#222;border:2px solid rgba(255,255,255,.4);z-index:2;"></video>'
      : '<audio id="call-remote-audio" autoplay playsinline style="display:none;"></audio>' +
        '<video id="call-local-video"  autoplay playsinline muted style="display:none;"></video>') +

    '<div style="position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;padding-top:' + (isActive && isVideo ? '50px' : '0') + ';gap:14px;">' +
      '<div style="position:relative;">' + av + (isActive ? '<div style="position:absolute;bottom:2px;right:2px;width:18px;height:18px;background:#22c55e;border-radius:50%;border:2px solid #fff;"></div>' : '') + '</div>' +
      '<div style="color:#fff;font-size:22px;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.4);">' + name + '</div>' +
      '<div style="color:rgba(255,255,255,.7);font-size:14px;font-weight:500;">' + statusText + '</div>' +
      (isActive ? '<div id="call-timer" style="color:rgba(255,255,255,.9);font-size:15px;font-weight:600;letter-spacing:1px;">00:00</div>' : '') +
    '</div>' +

    '<div style="position:absolute;bottom:50px;left:0;right:0;z-index:4;display:flex;align-items:center;justify-content:center;gap:' + (isActive ? '20px' : '40px') + ';">' +
    (isIn
      ? '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><button onclick="acceptCall()" style="' + _btnStyle('#22c55e','rgba(34,197,94,.5)') + '">' + _ico_accept() + '</button><span style="color:rgba(255,255,255,.7);font-size:12px;">قبول</span></div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><button onclick="rejectCall()" style="' + _btnStyle('#ef4444','rgba(239,68,68,.5)') + '">' + _ico_end() + '</button><span style="color:rgba(255,255,255,.7);font-size:12px;">رفض</span></div>'
      : isActive
      ? '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><button id="call-btn-mic" onclick="toggleMic()" style="' + _btnStyleSm() + '" title="كتم">' + _ico_mic() + '</button><span style="color:rgba(255,255,255,.6);font-size:11px;">ميكروفون</span></div>' +
        (isVideo ? '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><button id="call-btn-cam" onclick="toggleCam()" style="' + _btnStyleSm() + '" title="كاميرا">' + _ico_cam() + '</button><span style="color:rgba(255,255,255,.6);font-size:11px;">كاميرا</span></div>' : '') +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><button onclick="endCall()" style="' + _btnStyle('#ef4444','rgba(239,68,68,.5)') + '">' + _ico_end() + '</button><span style="color:rgba(255,255,255,.7);font-size:12px;">إنهاء</span></div>'
      : '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><button onclick="endCall()" style="' + _btnStyle('#ef4444','rgba(239,68,68,.5)') + '">' + _ico_end() + '</button><span style="color:rgba(255,255,255,.7);font-size:12px;">إلغاء</span></div>'
    ) +
    '</div>' +

    (isIn
      ? '<style>@keyframes cp{0%{transform:scale(1);opacity:.6}50%{transform:scale(1.4);opacity:0}100%{transform:scale(1);opacity:.6}}</style>' +
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:0;">' +
        '<div style="position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,107,53,.2);top:-100px;left:-100px;animation:cp 1.5s ease-out infinite;"></div>' +
        '<div style="position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,107,53,.15);top:-100px;left:-100px;animation:cp 1.5s ease-out .4s infinite;"></div>' +
        '<div style="position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,107,53,.1);top:-100px;left:-100px;animation:cp 1.5s ease-out .8s infinite;"></div>' +
        '</div>'
      : '') +
    '</div>';

  setTimeout(() => {
    if (localStream)  { const lv = document.getElementById('call-local-video');  if (lv) lv.srcObject  = localStream;  }
    if (remoteStream) { const rv = document.getElementById('call-remote-video'); if (rv) rv.srcObject = remoteStream;
                        const ra = document.getElementById('call-remote-audio'); if (ra) ra.srcObject = remoteStream; }
  }, 80);
}

function _hideCallUI() {
  const ov = document.getElementById('call-overlay');
  if (ov) ov.remove();
}

function _ico_mic()    { return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>'; }
function _ico_micOff() { return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>'; }
function _ico_cam()    { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>'; }
function _ico_camOff() { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 6 4V8l-6 4"/><path d="M2 2l20 20"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>'; }
function _ico_accept() { return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'; }
function _ico_end()    { return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7a2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" y1="2" x2="2" y2="22"/></svg>'; }

function startGlobalCallListener() {
  if (!currentUser) return;
  if (_globalCallCh) { try { sb.removeChannel(_globalCallCh); } catch(e){} }
  _globalCallCh = sb.channel('incoming_' + currentUser.id)
    .on('broadcast', { event: 'call_request' }, ({ payload }) => {
      if (payload.to !== currentUser.id) return;
      if (callState !== 'idle') {
        const tmp = sb.channel(_callChId(currentUser.id, payload.from)).subscribe();
        setTimeout(() => {
          tmp.send({ type:'broadcast', event:'call_signal', payload:{ type:'rejected', from:currentUser.id, reason:'busy' } });
          setTimeout(() => { try { sb.removeChannel(tmp); } catch(e){} }, 1000);
        }, 400);
        return;
      }
      callState = 'receiving'; callType = payload.callType;
      callPartner = { id: payload.from, username: payload.callerName, avatar_url: payload.callerAvatar, display_name: payload.callerName };
      isCallInitiator = false;
      _joinCallChannel(payload.from);
      _showCallUI('incoming');
    })
    .subscribe();
}
