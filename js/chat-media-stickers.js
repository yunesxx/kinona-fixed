// ══════════════════════════════════════
// STICKER PICKER
// ══════════════════════════════════════
function openStickerPicker(){
  switchStickerMode(activeStickerMode);
  $('sticker-overlay').classList.add('show');
}
function closeStickerPicker(){ $('sticker-overlay').classList.remove('show'); }

function switchStickerMode(mode){
  activeStickerMode = mode;
  $('mode-tab-emoji').classList.toggle('active', mode==='emoji');
  $('mode-tab-img').classList.toggle('active', mode==='img');
  if(mode === 'emoji'){
    renderStickerTabs();
    renderStickerGrid(activeStickerCat);
  } else {
    renderImgPackTabs();
    renderImgGrid(activeImgPack);
  }
}

// ── إيموجي ──
function renderStickerTabs(){
  $('sticker-tabs').innerHTML = STICKER_CATS.map(cat =>
    `<button class="sticker-tab ${cat===activeStickerCat?'active':''}" onclick="switchStickerCat('${cat}')">${cat}</button>`
  ).join('');
}
function switchStickerCat(cat){
  activeStickerCat = cat;
  renderStickerTabs();
  renderStickerGrid(cat);
}
function renderStickerGrid(cat){
  $('sticker-grid').innerHTML = (STICKERS[cat]||[]).map(s =>
    `<button class="sitem" onclick="sendSticker('${s}')">${s}</button>`
  ).join('');
}

// ── صور ──
function renderImgPackTabs(){
  $('sticker-tabs').innerHTML = IMG_PACK_NAMES.map(pack =>
    `<button class="sticker-tab ${pack===activeImgPack?'active':''}" onclick="switchImgPack(this.dataset.pack)" data-pack="${pack}">${pack}</button>`
  ).join('');
}
function switchImgPack(pack){
  activeImgPack = pack;
  renderImgPackTabs();
  renderImgGrid(pack);
}
function renderImgGrid(pack){
  const imgs = IMG_STICKER_PACKS[pack]||[];
  $('sticker-grid').innerHTML = imgs.map(url =>
    `<button class="sitem-img" onclick="sendImgSticker(this.dataset.url)" data-url="${url}">
      <img src="${url}" loading="lazy" alt="sticker">
    </button>`
  ).join('');
}

async function sendImgSticker(url){
  closeStickerPicker();
  if(!activeChat) return;
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const {data:inserted} = await sb.from('messages').insert({
    chat_id:cid, from_id:currentUser.id, to_id:activeChat.id,
    text:'', msg_type:'img_sticker', media_url: url
  }).select().single();
  if(inserted){
    appendMessage(inserted, true);
    bumpChatToTop(activeChat.id, '🖼️ ستكر');
    if(msgChannel) msgChannel.send({type:'broadcast',event:'new_msg',payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(activeChat.id, inserted);
  }
}

async function sendSticker(emoji){
  closeStickerPicker();
  if(!activeChat) return;
  const cid = [currentUser.id, activeChat.id].sort().join('_');
  const {data:inserted} = await sb.from('messages').insert({
    chat_id:cid, from_id:currentUser.id, to_id:activeChat.id,
    text:emoji, msg_type:'sticker'
  }).select().single();
  if(inserted){
    appendMessage(inserted, true);
    bumpChatToTop(activeChat.id, '😊 ستكر');
    if(msgChannel) msgChannel.send({type:'broadcast',event:'new_msg',payload:{from:currentUser.id, msg:inserted}});
    broadcastToInbox(activeChat.id, inserted);
  }
}

