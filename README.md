# Kinona — Project Structure

## Files Overview

```
kinona/
├── index.html          # HTML structure only (~1,045 lines)
├── css/
│   └── style.css       # All styles (~2,655 lines)
├── js/
│   ├── config.js       # Supabase config, constants, global state
│   ├── utils.js        # makeAv(), escHtml(), showToast(), addLongPress()
│   ├── loader.js       # showLoader() / hideLoader()
│   ├── auth.js         # login, register, verifyCode, logout
│   ├── navigation.js   # showPage() — tab switching with sessionStorage
│   ├── avatar.js       # uploadAvatar(), triggerAvatarUpload()
│   ├── notifications.js# push notifications, real-time listener, badges
│   ├── profile.js      # My profile inline view, edit profile modal
│   ├── search.js       # searchUsers(), doSearch()
│   ├── posts.js        # loadFeed(), publishPost(), comments, reactions
│   ├── post-viewer.js  # Full-screen reel-style post viewer
│   ├── saved.js        # Saved posts + share post
│   ├── view-profile.js # Other users' profile page + follow/block
│   ├── chat.js         # openChat(), sendMessage(), real-time messages
│   ├── chat-media.js   # Image/video/sticker sending in chat
│   ├── chats-list.js   # loadChats(), chat list + delete conversation
│   ├── chat-info.js    # Chat info page, themes, shared media
│   ├── cinema.js       # Cinema room — video sync, controls, chat
│   ├── admin.js        # Admin panel — cinema admin, kick, announce
│   ├── back-nav.js     # Android back button / gesture handling
│   └── init.js         # App bootstrap, auth state listener, DOMContentLoaded
```

## Load Order (important)
Scripts must load in the order listed in index.html:
`config → utils → loader → auth → navigation → ... → init`

## Key Global Variables (in config.js)
- `currentUser` — logged-in Supabase user
- `currentProfile` — profile row from DB
- `sb` — Supabase client instance
- `profileCache` — in-memory cache for user profiles

## Notes on innerHTML Usage (Known Issue)
The following functions use full innerHTML rebuilds and should be 
refactored to use DOM diffing (or a virtual DOM approach) in the future:
- `loadFeed()` in posts.js
- `loadMessages()` in chat.js
- `loadChats()` in chats-list.js
- `renderProfileTab()` in view-profile.js
