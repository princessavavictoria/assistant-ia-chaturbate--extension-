const iframe = document.getElementById('app-frame');

// Écouter les messages venant du content script de Chaturbate et les relayer à l'iframe
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NEW_CHAT_MESSAGE') {
    console.log("Sidebar JS received message from extension, forwarding to iframe:", message);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(message, '*');
    }
  }
});
