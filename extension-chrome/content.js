console.log("CB AI Assistant (Direct Web): Content script loaded.");

let lastProcessedMessage = "";
let isObserving = false;

function extractMessage(node) {
  try {
    const usernameNode = node.querySelector('.username, .m-user-name, span[data-nick]');
    const textNode = node.querySelector('.text, .m-chat-text, em');
    
    if (usernameNode && textNode) {
      let username = usernameNode.innerText.trim().replace(':', '');
      if (!username && usernameNode.getAttribute('data-nick')) {
        username = usernameNode.getAttribute('data-nick');
      }
      
      let text = textNode.innerText.trim();
      
      if (text.startsWith(username)) {
         text = text.substring(username.length).replace(/^:/, '').trim();
      }
      
      return { username, text, timestamp: Date.now() };
    }
  } catch (e) {
    console.error("CB AI Assistant: Error extracting message:", e);
  }
  return null;
}

function startObserving() {
  if (isObserving) return;
  
  const chatBox = document.querySelector('.chat-list, .chat-box, #chat_list, .chat-container');
  
  if (!chatBox) {
    setTimeout(startObserving, 2000);
    return;
  }

  isObserving = true;
  console.log("CB AI Assistant: Chat box found, observing for new messages...");

  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const msgData = extractMessage(node);
            
            if (msgData && msgData.text !== lastProcessedMessage && msgData.text.length > 0) {
              lastProcessedMessage = msgData.text;
              console.log("CB AI Assistant: New message detected:", msgData);
              
              try {
                chrome.runtime.sendMessage({
                  type: 'NEW_CHAT_MESSAGE',
                  payload: msgData
                });
              } catch (e) {
                console.warn("CB AI Assistant: Could not send message.", e);
              }
            }
          }
        });
      }
    }
  });

  observer.observe(chatBox, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserving);
} else {
  startObserving();
}
