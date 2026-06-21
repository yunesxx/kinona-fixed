// ══ الحالة العامة للتطبيق ══
let currentUser = null;
let currentProfile = null;
let activeChat = null;
let msgChannel = null;
let selectedMsgId = null;
let selectedMsgIsOwn = null;
let selectedChatUserId = null;
let currentPostType = 'text';
let selectedPostFile = null;
let selectedPostId = null;
let profileUserId = null;
let appInited = false;
let isRegistering = false;
let pendingRegData = null;
let verifyCodeVal = '';

const seenTimestamps = {};
let seenLabelTimer = null;
let seenPollTimer = null;
let _msgPollTimer = null;   // مزامنة الرسائل الواردة (شبكة أمان فوق الـ broadcast)
let _lastMsgSync = null;    // cursor: آخر created_at تمت مزامنته
let typingTimer = null;
let isTyping = false;
const chatListTyping = {};
const profileCache = {};

const STICKERS = {
  '😂': ['😂','😭','🥹','😍','🤩','😎','🥳','😤','🫡','🤯','😱','🤮','💀','👻','🫶','❤️','🔥','💯','✨','🎉'],
};
const IMG_STICKER_PACKS = {
  '🔥': [],   // يُملأ ديناميكياً من avatars/sex/
};
const IMG_PACK_BUCKETS = {
  '🔥': { bucket:'posts', folder:'avatars/sex' },
};
const STICKER_CATS = Object.keys(STICKERS);
const IMG_PACK_NAMES = Object.keys(IMG_STICKER_PACKS);
let activeStickerCat = STICKER_CATS[0];
let activeStickerMode = 'emoji';
let activeImgPack = IMG_PACK_NAMES[0];
let activeCommentsPostId = null;
let _chatOpenedFrom = null;   // 'comments' إذا فُتح الشات من التعليقات
let _chatFromPostId = null;   // معرّف المنشور لإعادة فتح التعليقات عند الرجوع
