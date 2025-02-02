// Use the appropriate API namespace
const browserAPI = (typeof chrome !== 'undefined' ? chrome :
                   typeof browser !== 'undefined' ? browser :
                   null);

if (!browserAPI) {
    throw new Error('No browser API found');
}

let currentInput = null;
let overlayButton = null;
let panel = null;
let defaultPrompt = "Fix typos, spelling and grammar, only output the corrected text and nothing else. Use idioms where appropriate, if the input language is English. If German text contains English phrases, correct and keep them in English. Keep profanity."

let defaultSettings = {
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-4o-mini"
};

function loadSettings() {
  return browserAPI.storage.local.get('texty-settings').then(result => {
    return result['texty-settings'] || defaultSettings;
  });
}

function saveSettings(settings) {
  return browserAPI.storage.local.set({ 'texty-settings': settings });
}

function createOverlayButton() {
  overlayButton = document.createElement("button");
  overlayButton.className = "texty-overlay-button";
  overlayButton.textContent = "Ty";
  overlayButton.style.width = "fit-content";
  overlayButton.style.minWidth = "min-content";
  overlayButton.addEventListener("click", showPanel);
  document.body.appendChild(overlayButton);

  // Create modal backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "texty-backdrop";
  backdrop.style.display = "none";
  document.body.appendChild(backdrop);
}

async function createPanel() {
  panel = document.createElement("div");
  panel.className = "texty-panel";
  panel.innerHTML = `
    <div class="texty-header">
      <strong>Texty</strong>
      <button id="texty-settings-toggle" class="texty-settings-toggle">Settings</button>
    </div>
    <div id="texty-settings" class="texty-settings-panel" style="display: none;">
      <label for="texty-endpoint">API Endpoint *</label>
      <input type="text" id="texty-endpoint" required />
      <label for="texty-api-key">API Key *</label>
      <input type="password" id="texty-api-key" required />
      <label for="texty-model">Model Name *</label>
      <input type="text" id="texty-model" required />
    </div>
    <div id="texty-error" class="texty-error" style="display: none;"></div>
    <label for="texty-content">Content</label>
    <textarea id="texty-content" rows="10" placeholder="Content to edit..."></textarea>
    <label for="texty-prompt">Prompt</label>
    <textarea id="texty-prompt" rows="4"></textarea>
    <div class="texty-panel-buttons">
      <span class="status-text" style="display: none;">Fixing...</span>
      <button id="texty-fix">Fix</button>
      <button id="texty-apply">Apply</button>
      <button id="texty-close">Close</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Add click handler to backdrop
  const backdrop = document.querySelector('.texty-backdrop');
  backdrop.addEventListener('click', hidePanel);

  // Add escape key handler
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.style.display === 'block') {
      hidePanel();
    }
  });

  // Initialize settings
  const settings = await loadSettings();
  document.getElementById("texty-endpoint").value = settings.endpoint;
  document.getElementById("texty-api-key").value = settings.apiKey;
  document.getElementById("texty-model").value = settings.model;

  // Add settings event listeners
  document.getElementById("texty-settings-toggle").addEventListener("click", toggleSettings);
  ["texty-endpoint", "texty-api-key", "texty-model"].forEach(id => {
    document.getElementById(id).addEventListener("change", updateSettings);
  });

  document.getElementById("texty-fix").addEventListener("click", handleFix);
  document.getElementById("texty-apply").addEventListener("click", handleApply);
  document.getElementById("texty-close").addEventListener("click", hidePanel);
  document.getElementById("texty-prompt").value = defaultPrompt;

  // Check settings validity on load
  await checkSettingsValidity();
}

function showPanel() {
  if (currentInput) {
    panel.style.display = "block";
    document.querySelector('.texty-backdrop').style.display = "block";
    document.getElementById("texty-content").value = currentInput.value;
  }
}

function hidePanel() {
  panel.style.display = "none";
  document.querySelector('.texty-backdrop').style.display = "none";
  document.getElementById("texty-content").value = "";
  if (currentInput) {
    currentInput.focus();
  }
}

function toggleSettings() {
  const settingsPanel = document.getElementById("texty-settings");
  const isHidden = settingsPanel.style.display === "none";
  settingsPanel.style.display = isHidden ? "block" : "none";
}

async function checkSettingsValidity() {
  const settings = await loadSettings();
  const isValid = settings.endpoint && settings.apiKey && settings.model;

  const fixButton = document.getElementById("texty-fix");
  const applyButton = document.getElementById("texty-apply");
  const settingsPanel = document.getElementById("texty-settings");

  fixButton.disabled = !isValid;
  applyButton.disabled = !isValid;

  if (!isValid) {
    settingsPanel.style.display = "block";

    // Highlight missing fields
    ["texty-endpoint", "texty-api-key", "texty-model"].forEach(id => {
      const input = document.getElementById(id);
      input.classList.toggle("texty-required", !input.value);
    });
  }
}

async function updateSettings() {
  const settings = {
    endpoint: document.getElementById("texty-endpoint").value,
    apiKey: document.getElementById("texty-api-key").value,
    model: document.getElementById("texty-model").value
  };
  await saveSettings(settings);
  await checkSettingsValidity();
}

async function handleFix() {
  const fixButton = document.getElementById("texty-fix");
  const applyButton = document.getElementById("texty-apply");
  const content = document.getElementById("texty-content");
  const prompt = document.getElementById("texty-prompt");
  const errorDiv = document.getElementById("texty-error");
  const statusText = document.querySelector(".status-text");

  // Reset error state
  errorDiv.style.display = "none";
  errorDiv.textContent = "";

  // Set loading state
  fixButton.disabled = true;
  applyButton.disabled = true;
  content.disabled = true;
  prompt.disabled = true;
  statusText.style.display = "inline-block";

  try {
    const settings = await loadSettings();
    const response = await browserAPI.runtime.sendMessage({
      type: 'makeApiCall',
      endpoint: settings.endpoint,
      apiKey: settings.apiKey,
      model: settings.model,
      messages: [
        {
          role: "system",
          content: prompt.value,
        },
        {
          role: "user",
          content: content.value,
        },
      ]
    });

    if (response.success) {
      content.value = response.data.choices[0].message.content;
    } else {
      errorDiv.textContent = `Error: ${response.error}`;
      errorDiv.style.display = "block";
    }
  } catch (error) {
    errorDiv.textContent = `Error: ${error.message}`;
    errorDiv.style.display = "block";
  } finally {
    // Reset loading state
    fixButton.disabled = false;
    applyButton.disabled = false;
    content.disabled = false;
    prompt.disabled = false;
    statusText.style.display = "none";
  }
}

function handleApply() {
  if (currentInput) {
    currentInput.value = document.getElementById("texty-content").value;
    currentInput.dispatchEvent(new Event("input", { bubbles: true }));
    currentInput.dispatchEvent(new Event("change", { bubbles: true }));
    hidePanel();
  }
}

function handleFocus(event) {
  if (
    (event.target.tagName === "TEXTAREA" ||
    (event.target.tagName === "INPUT" && event.target.type === "text")) &&
    !event.target.closest('.texty-panel')
  ) {
    currentInput = event.target;
    overlayButton.style.display = "block";

    const rect = currentInput.getBoundingClientRect();
    overlayButton.style.position = "fixed";
    overlayButton.style.top = `${rect.top}px`;
    overlayButton.style.left = `${rect.right + 5}px`;
  }
}

function handleBlur(event) {
  setTimeout(() => {
    if (!panel.contains(document.activeElement) &&
        !overlayButton.contains(document.activeElement) &&
        document.activeElement !== currentInput) {
      overlayButton.style.display = "none";
    }
  }, 300);
}

function updateButtonPosition() {
  if (currentInput && overlayButton.style.display === "block") {
    const rect = currentInput.getBoundingClientRect();
    overlayButton.style.top = `${rect.top}px`;
    overlayButton.style.left = `${rect.right + 5}px`;
  }
}

async function init() {
  createOverlayButton();
  await createPanel();
  document.addEventListener("focus", handleFocus, true);
  document.addEventListener("blur", handleBlur, true);
  window.addEventListener("resize", updateButtonPosition);
  document.addEventListener("scroll", updateButtonPosition, true);
}

init().catch(console.error);
