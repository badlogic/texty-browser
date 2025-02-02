// Use the appropriate API namespace
const browserAPI = (typeof chrome !== 'undefined' ? chrome :
                   typeof browser !== 'undefined' ? browser :
                   null);

if (!browserAPI) {
    throw new Error('No browser API found');
}

// Initialize on installation
browserAPI.runtime.onInstalled.addListener(() => {
  // Set default settings if not already set
  browserAPI.storage.local.get('texty-settings').then(result => {
    if (!result['texty-settings']) {
      browserAPI.storage.local.set({
        'texty-settings': {
          endpoint: "https://api.openai.com/v1/chat/completions",
          apiKey: "",
          model: "gpt-4o-mini"
        }
      });
    }
  });
});

// Listen for messages from content script
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'makeApiCall') {
    fetch(request.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages
      }),
    })
    .then(response => response.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Required for async response
  }
});