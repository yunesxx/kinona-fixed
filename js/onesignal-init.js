window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  try {
    await OneSignal.init({
      appId: "c44a2053-3d55-433c-abd7-9dd760075aeb",
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          prompts: [{
            type: "push",
            autoPrompt: true,
            text: {
              actionMessage: "كينونا تريد إرسال إشعارات لك عند وصول رسائل ومتابعات جديدة",
              acceptButton: "السماح",
              cancelButton: "لا شكراً"
            },
            delay: { pageViews: 1, timeDelay: 3 }
          }]
        }
      }
    });
  } catch(e) {
    // OneSignal لا يعمل على هذا الـ domain — يُتجاهل بهدوء
    console.warn('OneSignal init skipped:', e.message);
  }
});
