// Permet d'ouvrir le panneau latéral en cliquant sur l'icône de l'extension
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Écoute les messages du content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_CHAT_MESSAGE') {
    console.log("Background received message from Chaturbate:", message.payload);
  }
});
