// ══════════════════════════════════════
// 5.5 تطبيق Cosmetics على عناصر الـ DOM بعد الرندر
// ══════════════════════════════════════

/**
 * يطبق كل الـ cosmetics على بطاقة بوست أو رسالة
 * @param {string} userId  - معرّف المستخدم
 * @param {Element} container - عنصر الـ DOM الذي يحتوي username/avatar
 * @param {string} usernameSelector  - CSS selector لعنصر الاسم
 * @param {string} avatarSelector    - CSS selector لعنصر الأفاتار (img أو div)
 * @param {string} badgeInsertAfter  - CSS selector للعنصر اللي بتحقن بعده الـ badge/flair
 */
async function applyCosmeticsToElement(userId, container, usernameSelector, avatarSelector, badgeInsertAfter) {
  if (!userId || !container) return;

  const [usernameColorC, gradientC, avatarBorderC, badgeC, flairC, titleC, auraC] = await Promise.all([
    getUserCosmetic(userId, 'username_color'),
    getUserCosmetic(userId, 'username_gradient'),
    getUserCosmetic(userId, 'avatar_border'),
    getUserCosmetic(userId, 'badge'),
    getUserCosmetic(userId, 'flair'),
    getUserCosmetic(userId, 'royal_title'),
    getUserCosmetic(userId, 'radiance_aura'),
  ]);

  // ── لون / gradient الاسم ──
  if (usernameSelector) {
    container.querySelectorAll(usernameSelector).forEach(nameEl => {
      if (gradientC && gradientC.value) {
        nameEl.style.setProperty('background', gradientC.value, 'important');
        nameEl.style.setProperty('-webkit-background-clip', 'text', 'important');
        nameEl.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        nameEl.style.setProperty('background-clip', 'text', 'important');
        nameEl.style.removeProperty('color');
      } else if (usernameColorC && usernameColorC.value) {
        nameEl.style.setProperty('color', usernameColorC.value, 'important');
        nameEl.style.setProperty('-webkit-text-fill-color', usernameColorC.value, 'important');
        nameEl.style.removeProperty('background');
        nameEl.style.removeProperty('background-clip');
        nameEl.style.removeProperty('-webkit-background-clip');
      } else {
        nameEl.style.removeProperty('background');
        nameEl.style.removeProperty('background-clip');
        nameEl.style.removeProperty('-webkit-background-clip');
        nameEl.style.removeProperty('-webkit-text-fill-color');
      }
      // ── اللقب الملكي بجانب كل اسم ──
      if (titleC) applyRoyalTitle(nameEl, titleC.value);
    });
  }

  // ── إطار الأفاتار ──
  if (avatarSelector) {
    const avEl = container.querySelector(avatarSelector);
    if (avEl) {
      const target = avEl.tagName === 'IMG' ? avEl.parentElement : avEl;
      if (target) {
        if (avatarBorderC) {
          const c = avatarBorderC.value;
          target.style.setProperty('box-shadow', `0 0 0 3px ${c}, 0 0 12px 5px ${c}99, 0 0 24px 10px ${c}44`, 'important');
          target.style.setProperty('border-radius', '50%', 'important');
        }
        // ── هالة النور على الأفاتار ──
        if (auraC) applyRadianceAura(target, auraC.value);
      }
    }
  }

  // ── badge / flair ──
  if ((badgeC || flairC) && badgeInsertAfter) {
    const anchorEl = container.querySelector(badgeInsertAfter);
    if (anchorEl) {
      anchorEl.parentElement?.querySelectorAll('.cs-badge, .cs-flair').forEach(e => e.remove());
      let badgeHtml = '';
      if (badgeC)  badgeHtml += `<span class="cs-badge cs-badge-${badgeC.value.toLowerCase().replace(/\s+/g,'-')}">${badgeC.value}</span>`;
      if (flairC)  badgeHtml += `<span class="cs-flair">${flairC.value}</span>`;
      anchorEl.insertAdjacentHTML('afterend', badgeHtml);
    }
  }
}

/**
 * يطبق cosmetics على قائمة بوستات بعد loadFeed()
 * بيستخدم نفس pattern الـ level badges
 * @param {Array} posts - مصفوفة البوستات (id, user_id)
 */
async function applyPostsCosmetics(posts) {
  if (!posts?.length) return;
  const uniqueIds = [...new Set(posts.map(p => p.user_id))];
  // prefetch cosmetics لكل يوزر دفعة واحدة (بيملأ الـ cache)
  await Promise.all(uniqueIds.map(uid => fetchUserCosmetics(uid)));

  await Promise.all(posts.map(p => {
    const card = document.getElementById('post-' + p.id);
    if (!card) return Promise.resolve();
    return applyCosmeticsToElement(
      p.user_id, card,
      '.post-username',
      '.post-av-zoom img, .post-av-zoom span',
      '.post-username'
    );
  }));
}

/**
 * يطبق cosmetics على شاشة المحادثة (chat)
 * @param {string} userId - معرّف الطرف الثاني في المحادثة
 */
async function applyChatCosmetics(userId) {
  if (!userId) return;
  await fetchUserCosmetics(userId);

  const [gradC, colorC, avatarBorderC, titleC, auraC, glowC, bubStyleC] = await Promise.all([
    getUserCosmetic(userId, 'username_gradient'),
    getUserCosmetic(userId, 'username_color'),
    getUserCosmetic(userId, 'avatar_border'),
    getUserCosmetic(userId, 'royal_title'),
    getUserCosmetic(userId, 'radiance_aura'),
    getUserCosmetic(userId, 'luminous_script'),
    getUserCosmetic(userId, 'bubble_style'),
  ]);

  // ── اسم في header المحادثة ──
  const chatName = document.getElementById('chat-name');
  if (chatName) {
    if (gradC) {
      chatName.style.setProperty('background', gradC.value, 'important');
      chatName.style.setProperty('-webkit-background-clip', 'text', 'important');
      chatName.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      chatName.style.setProperty('background-clip', 'text', 'important');
    } else if (colorC) {
      chatName.style.setProperty('color', colorC.value, 'important');
      chatName.style.setProperty('-webkit-text-fill-color', colorC.value, 'important');
      chatName.style.removeProperty('background');
    }
    if (titleC) applyRoyalTitle(chatName, titleC.value);
  }

  // ── اسم في بطاقة البروفايل داخل المحادثة ──
  const profileNameEl = document.querySelector('.chat-profile-name');
  if (profileNameEl) {
    if (gradC) {
      profileNameEl.style.setProperty('background', gradC.value, 'important');
      profileNameEl.style.setProperty('-webkit-background-clip', 'text', 'important');
      profileNameEl.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      profileNameEl.style.setProperty('background-clip', 'text', 'important');
    } else if (colorC) {
      profileNameEl.style.setProperty('color', colorC.value, 'important');
      profileNameEl.style.setProperty('-webkit-text-fill-color', colorC.value, 'important');
    }
    if (titleC) applyRoyalTitle(profileNameEl, titleC.value);
  }

  // ── أفاتار header ──
  const chatAv = document.getElementById('chat-av');
  if (chatAv) {
    if (avatarBorderC) {
      const c = avatarBorderC.value;
      chatAv.style.setProperty('box-shadow', `0 0 0 3px ${c}, 0 0 12px 5px ${c}99, 0 0 24px 10px ${c}44`, 'important');
      chatAv.style.setProperty('border-radius', '50%', 'important');
    }
    if (auraC) applyRadianceAura(chatAv, auraC.value);
  }

  // ── أفاتارات الرسائل الواردة ──
  document.querySelectorAll('.mrow.in .msg-av').forEach(avEl => {
    if (avatarBorderC) {
      const c = avatarBorderC.value;
      avEl.style.setProperty('box-shadow', `0 0 0 3px ${c}, 0 0 12px 5px ${c}99, 0 0 24px 10px ${c}44`, 'important');
      avEl.style.setProperty('border-radius', '50%', 'important');
    }
    if (auraC) applyRadianceAura(avEl, auraC.value);
  });

  // ── النص المضيء على رسائله الواردة ──
  if (glowC) {
    document.querySelectorAll('.mrow.in .bub').forEach(bubble => {
      applyLuminousScript(bubble, glowC.value);
    });
  }

  // ── لون النص على الرسائل الواردة ──
  if (colorC || gradC) {
    document.querySelectorAll('.mrow.in .bub').forEach(bubble => {
      if (gradC) {
        bubble.style.setProperty('background', gradC.value, 'important');
        bubble.style.setProperty('-webkit-background-clip', 'text', 'important');
        bubble.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        bubble.style.setProperty('background-clip', 'text', 'important');
      } else if (colorC) {
        bubble.style.setProperty('color', colorC.value, 'important');
        bubble.style.setProperty('-webkit-text-fill-color', colorC.value, 'important');
      }
    });
  }

  // ── ستايل الفقاعة على رسائله الواردة ──
  if (bubStyleC) {
    const [bubBg, bubText, bubBorder] = bubStyleC.value.split('|');
    const senderName = (typeof activeChat !== 'undefined' && activeChat?.username) || '';
    document.querySelectorAll('.mrow.in .bub').forEach(bub => {
      if (bubBg)     bub.style.setProperty('background', bubBg, 'important');
      if (bubText) {
        bub.style.setProperty('color', bubText, 'important');
        bub.style.setProperty('-webkit-text-fill-color', bubText, 'important');
      }
      if (bubBorder) bub.style.setProperty('box-shadow', `0 0 0 1.5px ${bubBorder}, 0 0 8px 2px ${bubBorder}66`, 'important');
      if (senderName && !bub.previousElementSibling?.classList.contains('bub-uname')) {
        const nameEl = document.createElement('span');
        nameEl.className = 'bub-uname';
        nameEl.textContent = senderName;
        bub.parentElement.insertBefore(nameEl, bub);
      }
    });
  }

  // ── cosmetics المستخدم الحالي على رسائله الصادرة ──
  if (typeof currentUser !== 'undefined' && currentUser?.id) {
    await fetchUserCosmetics(currentUser.id);
    const [myGradC, myColorC, myAuraC, myGlowC, myAvatarBorderC, myBubStyleC] = await Promise.all([
      getUserCosmetic(currentUser.id, 'username_gradient'),
      getUserCosmetic(currentUser.id, 'username_color'),
      getUserCosmetic(currentUser.id, 'radiance_aura'),
      getUserCosmetic(currentUser.id, 'luminous_script'),
      getUserCosmetic(currentUser.id, 'avatar_border'),
      getUserCosmetic(currentUser.id, 'bubble_style'),
    ]);

    if (myGlowC) {
      document.querySelectorAll('.mrow.out .bub').forEach(bubble => {
        applyLuminousScript(bubble, myGlowC.value);
      });
    }

    if (myColorC || myGradC) {
      document.querySelectorAll('.mrow.out .bub').forEach(bubble => {
        if (myGradC) {
          bubble.style.setProperty('background', myGradC.value, 'important');
          bubble.style.setProperty('-webkit-background-clip', 'text', 'important');
          bubble.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
          bubble.style.setProperty('background-clip', 'text', 'important');
        } else if (myColorC) {
          bubble.style.setProperty('color', myColorC.value, 'important');
          bubble.style.setProperty('-webkit-text-fill-color', myColorC.value, 'important');
        }
      });
    }

    if (myBubStyleC) {
      const [bubBg, bubText, bubBorder] = myBubStyleC.value.split('|');
      const myName = currentProfile?.username || '';
      document.querySelectorAll('.mrow.out .bub').forEach(bub => {
        if (bubBg)     bub.style.setProperty('background', bubBg, 'important');
        if (bubText) {
          bub.style.setProperty('color', bubText, 'important');
          bub.style.setProperty('-webkit-text-fill-color', bubText, 'important');
        }
        if (bubBorder) bub.style.setProperty('box-shadow', `0 0 0 1.5px ${bubBorder}, 0 0 8px 2px ${bubBorder}66`, 'important');
        if (myName && !bub.previousElementSibling?.classList.contains('bub-uname')) {
          const nameEl = document.createElement('span');
          nameEl.className = 'bub-uname bub-uname-out';
          nameEl.textContent = myName;
          bub.parentElement.insertBefore(nameEl, bub);
        }
      });
    }
  }
}

/**
 * يطبق cosmetics على صفحة بروفايل مستخدم (view-profile)
 * @param {string} userId
 */
async function applyProfilePageCosmetics(userId) {
  if (!userId) return;
  await fetchUserCosmetics(userId);

  const [gradC, colorC, borderC, badgeC, flairC, titleC, auraC] = await Promise.all([
    getUserCosmetic(userId, 'username_gradient'),
    getUserCosmetic(userId, 'username_color'),
    getUserCosmetic(userId, 'avatar_border'),
    getUserCosmetic(userId, 'badge'),
    getUserCosmetic(userId, 'flair'),
    getUserCosmetic(userId, 'royal_title'),
    getUserCosmetic(userId, 'radiance_aura'),
  ]);

  // ── اسم المستخدم: p-username هو الاسم الكبير (display_name / username) ──
  // نطبّق على كلا العنصرين لضمان الظهور
  const targets = [
    document.getElementById('p-username'),
    document.getElementById('p-display-name'),
    document.getElementById('pv-username-hdr'),
  ].filter(Boolean);

  targets.forEach(el => {
    if (gradC) {
      el.style.setProperty('background', gradC.value, 'important');
      el.style.setProperty('-webkit-background-clip', 'text', 'important');
      el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      el.style.setProperty('background-clip', 'text', 'important');
      el.style.removeProperty('color');
    } else if (colorC) {
      el.style.setProperty('color', colorC.value, 'important');
      el.style.setProperty('-webkit-text-fill-color', colorC.value, 'important');
      el.style.removeProperty('background');
    }
  });

  // ── إطار الأفاتار: p-big-av هو الـ wrapper الصحيح ──
  const avatarWrapper = document.getElementById('p-big-av');
  if (avatarWrapper && borderC) {
    const c = borderC.value;
    avatarWrapper.style.setProperty('box-shadow', `0 0 0 3px ${c}, 0 0 12px 5px ${c}99, 0 0 24px 10px ${c}44`, 'important');
    avatarWrapper.style.setProperty('border-radius', '50%', 'important');
  }

  // ── badge / flair بعد الاسم ──
  const usernameEl = document.getElementById('p-username');
  if ((badgeC || flairC) && usernameEl) {
    usernameEl.parentElement?.querySelectorAll('.cs-badge, .cs-flair').forEach(e => e.remove());
    let badgeHtml = '';
    if (badgeC) badgeHtml += `<span class="cs-badge cs-badge-${badgeC.value.toLowerCase().replace(/\s+/g,'-')}">${badgeC.value}</span>`;
    if (flairC) badgeHtml += `<span class="cs-flair">${flairC.value}</span>`;
    usernameEl.insertAdjacentHTML('afterend', badgeHtml);
  }

  // ── اللقب الملكي ──
  if (titleC && usernameEl) {
    applyRoyalTitle(usernameEl, titleC.value);
  }

  // ── هالة النور على الأفاتار ──
  if (auraC) {
    const avWrapper = document.getElementById('p-big-av');
    if (avWrapper) applyRadianceAura(avWrapper, auraC.value);
  }
}

