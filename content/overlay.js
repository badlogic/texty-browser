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
  const buttonContainer = document.createElement("div");
  const shadow = buttonContainer.attachShadow({ mode: "open" });

  const styles = document.createElement("style");
  styles.textContent = `
    .texty-overlay-button {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      background: white;
      color: #000;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      z-index: 10000;
      width: fit-content;
      min-width: min-content;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  `;

  overlayButton = document.createElement("button");
  overlayButton.className = "texty-overlay-button";
  overlayButton.textContent = "Ty";
  overlayButton.addEventListener("click", showPanel);

  shadow.appendChild(styles);
  shadow.appendChild(overlayButton);
  document.body.appendChild(buttonContainer);

  // Create modal backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "texty-backdrop";
  backdrop.style.display = "none";
  document.body.appendChild(backdrop);
}

async function createPanel() {
  const panelContainer = document.createElement("div");
  const shadow = panelContainer.attachShadow({ mode: "open" });

  // Define styles directly
  const styles = document.createElement("style");
  styles.textContent = `
    .texty-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      color: #000;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      width: 500px;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .texty-panel textarea {
      width: 100%;
      margin-bottom: 10px;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      color: #000;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      resize: vertical;
    }

    .texty-panel input {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      color: #000;
      font-family: inherit;
      font-size: 14px;
    }

    .texty-panel label {
      display: block;
      margin-bottom: 4px;
      color: #000;
      font-size: 14px;
    }

    .texty-panel-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .texty-panel button {
      padding: 8px 16px;
      background-color: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
    }

    .texty-panel button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }

    .texty-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      border-bottom: 1px solid #ddd;
      margin-bottom: 8px;
    }

    .texty-settings-toggle {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 0.9em;
    }

    .texty-settings-toggle:hover {
      text-decoration: underline;
    }

    .texty-required {
      border-color: #ff4444;
      background-color: #fff8f8;
    }

    .texty-required:focus {
      outline-color: #ff4444;
    }

    .texty-error {
      background-color: #fff2f2;
      border: 1px solid #ffcdd2;
      color: #d32f2f;
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 4px;
      font-size: 14px;
    }

    .status-text {
      margin-right: auto;
      color: #666;
      font-size: 0.9em;
    }

    .texty-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
    }
  `;

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

  shadow.appendChild(styles);
  shadow.appendChild(panel);
  document.body.appendChild(panelContainer);

  // Update panel reference to point to the one in shadow DOM
  panel = shadow.querySelector('.texty-panel');

  // Add click handler to backdrop
  const backdrop = document.querySelector('.texty-backdrop');
  backdrop.addEventListener('click', hidePanel);

  // Add escape key handler
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.style.display === 'block') {
      hidePanel();
    }
  });

  // Update all event listeners to use shadow DOM queries
  const settingsToggle = shadow.getElementById("texty-settings-toggle");
  settingsToggle.addEventListener("click", toggleSettings);

  ["texty-endpoint", "texty-api-key", "texty-model"].forEach(id => {
    shadow.getElementById(id).addEventListener("change", updateSettings);
  });

  shadow.getElementById("texty-fix").addEventListener("click", handleFix);
  shadow.getElementById("texty-apply").addEventListener("click", handleApply);
  shadow.getElementById("texty-close").addEventListener("click", hidePanel);

  // Initialize settings
  const settings = await loadSettings();
  shadow.getElementById("texty-endpoint").value = settings.endpoint;
  shadow.getElementById("texty-api-key").value = settings.apiKey;
  shadow.getElementById("texty-model").value = settings.model;
  shadow.getElementById("texty-prompt").value = defaultPrompt;

  // Check settings validity on load
  await checkSettingsValidity(shadow);
}

function showPanel() {
  if (currentInput) {
    panel.style.display = "block";
    document.querySelector('.texty-backdrop').style.display = "block";

    // Get content from either contenteditable or traditional input
    const content = currentInput.isContentEditable ?
      currentInput.textContent :
      currentInput.value;

    const shadow = panel.getRootNode();
    shadow.getElementById("texty-content").value = content;
  }
}

function hidePanel() {
  panel.style.display = "none";
  document.querySelector('.texty-backdrop').style.display = "none";

  const shadow = panel.getRootNode();
  shadow.getElementById("texty-content").value = "";

  if (currentInput) {
    currentInput.focus();
  }
}

function toggleSettings() {
  const shadow = panel.getRootNode();
  const settingsPanel = shadow.getElementById("texty-settings");
  const isHidden = settingsPanel.style.display === "none";
  settingsPanel.style.display = isHidden ? "block" : "none";
}

async function checkSettingsValidity(shadow) {
  const settings = await loadSettings();
  const isValid = settings.endpoint && settings.apiKey && settings.model;

  const fixButton = shadow.getElementById("texty-fix");
  const applyButton = shadow.getElementById("texty-apply");
  const settingsPanel = shadow.getElementById("texty-settings");

  fixButton.disabled = !isValid;
  applyButton.disabled = !isValid;

  if (!isValid) {
    settingsPanel.style.display = "block";

    // Highlight missing fields
    ["texty-endpoint", "texty-api-key", "texty-model"].forEach(id => {
      const input = shadow.getElementById(id);
      input.classList.toggle("texty-required", !input.value);
    });
  }
}

async function updateSettings() {
  const shadow = panel.getRootNode();
  const settings = {
    endpoint: shadow.getElementById("texty-endpoint").value,
    apiKey: shadow.getElementById("texty-api-key").value,
    model: shadow.getElementById("texty-model").value
  };
  await saveSettings(settings);
  await checkSettingsValidity(shadow);
}

async function handleFix() {
  const shadow = panel.getRootNode();
  const fixButton = shadow.getElementById("texty-fix");
  const applyButton = shadow.getElementById("texty-apply");
  const content = shadow.getElementById("texty-content");
  const prompt = shadow.getElementById("texty-prompt");
  const errorDiv = shadow.getElementById("texty-error");
  const statusText = shadow.querySelector(".status-text");

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
    const shadow = panel.getRootNode();
    const content = shadow.getElementById("texty-content").value;

    currentInput.value = content;
    currentInput.dispatchEvent(new Event("input", { bubbles: true }));
    currentInput.dispatchEvent(new Event("change", { bubbles: true }));
    hidePanel();
  }
}

function handleFocus(event) {
  console.log('Focus event triggered on:', event.target);
  const target = event.target;

  // Check if element is text-editable through various means
  const isEditable = (
    // Traditional inputs
    (target.tagName === "TEXTAREA" ||
     (target.tagName === "INPUT" && target.type === "text")) ||
    // Contenteditable elements
    target.isContentEditable ||
    // ARIA textbox role
    target.getAttribute("role") === "textbox" ||
    // Rich text editors often use these roles
    target.getAttribute("role") === "textbox" ||
    target.getAttribute("role") === "input"
  );

  if (isEditable && !target.closest('.texty-panel')) {
    currentInput = target;
    overlayButton.style.display = "block";

    const rect = target.getBoundingClientRect();
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
