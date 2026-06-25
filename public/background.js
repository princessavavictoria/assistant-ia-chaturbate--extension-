// Allow users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_CHAT_MESSAGE') {
    // We just act as a router if needed, but sidepanel can listen directly.
    // However, it's good practice to log it here.
    console.log("Background received message:", message.payload);
  }
});
