console.log("CB AI Assistant: Content script loaded.");

let lastProcessedMessage = "";
let isObserving = false;

function extractMessage(node) {
  try {
    // Chaturbate chat structures can vary slightly, we look for common classes
    const usernameNode = node.querySelector('.username, .m-user-name, span[data-nick]');
    const textNode = node.querySelector('.text, .m-chat-text, em');
    
    if (usernameNode && textNode) {
      let username = usernameNode.innerText.trim().replace(':', '');
      if (!username && usernameNode.getAttribute('data-nick')) {
        username = usernameNode.getAttribute('data-nick');
      }
      
      let text = textNode.innerText.trim();
      
      // Remove username from text if it's prepended
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
  
  // Try to find the chat box container
  const chatBox = document.querySelector('.chat-list, .chat-box, #chat_list, .chat-container');
  
  if (!chatBox) {
    // Retry if chat box is not yet rendered
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
            
            // Only process if valid and not a duplicate
            if (msgData && msgData.text !== lastProcessedMessage && msgData.text.length > 0) {
              lastProcessedMessage = msgData.text;
              console.log("CB AI Assistant: New message detected:", msgData);
              
              // Send message to the side panel
              try {
                chrome.runtime.sendMessage({
                  type: 'NEW_CHAT_MESSAGE',
                  payload: msgData
                });
              } catch (e) {
                // Side panel might be closed or extension context invalidated
                console.warn("CB AI Assistant: Could not send message to side panel.", e);
              }
            }
          }
        });
      }
    }
  });

  observer.observe(chatBox, { childList: true, subtree: true });
}

// Start attempting to observe when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserving);
} else {
  startObserving();
}
