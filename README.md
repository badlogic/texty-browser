# Texty

A browser extension that helps you fix text in any input field using AI. Perfect for correcting grammar, spelling, and improving writing style on the fly.

## Features

- Works on any text input or textarea on any website
- Customizable AI prompts
- Support for different AI models and endpoints
- Privacy-focused: your API key stays in your browser

## Installation

### Chrome/Edge

1. Download the latest `texty-chrome.zip` from the [Releases page](../../releases)
2. Go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Drag and drop the downloaded zip file into the extensions page

### Firefox

1. Download the latest `texty-firefox.zip` from the [Releases page](../../releases)
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the downloaded zip file

## Setup

1. Click the Texty button in your browser toolbar
2. Click "Settings"
3. Enter your:
   - API Endpoint (e.g., https://api.openai.com/v1/chat/completions)
   - API Key
   - Model name (e.g., gpt-4, gpt-3.5-turbo)

## Usage

1. Click into any text input or textarea on any website
2. Look for the "Ty" button that appears next to the field
3. Click it to open the Texty panel
4. On first use, enter your:
   - API Endpoint (e.g., https://api.openai.com/v1/chat/completions)
   - API Key
   - Model name (e.g., gpt-4-turbo, gpt-3.5-turbo)
5. (Optional) Modify the prompt
6. Click "Fix" to process your text
7. Click "Apply" to update the original text field, or "Close" to cancel

Texty will always remember your last entered settings and prompt, so you do not have to re-enter them. Your settings, including your API key, are stored locally in your browser. You can verify this by inspecting the extension's source code.

## Development

### Prerequisites

- Git
- [jq](https://jqlang.org/)
- A modern web browser (Chrome/Firefox)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/texty.git
cd texty
```

### Loading for Development

#### Chrome

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project directory

#### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the project directory

### Project Structure

- `manifest.json` - Extension configuration
- `background.js` - Background service worker
- `content/` - Content scripts and styles
  - `overlay.js` - Main UI logic
  - `overlay.css` - Styles
- `popup/` - Browser toolbar popup
- `.github/workflows/` - CI/CD configuration

### Creating a Release

The easiest way to create a release is using the provided publish script:

```bash
./publish.sh
```

The script will:
- Increment the patch version in manifest.json
- Commit the change
- Create and push a tag
- Wait for the GitHub release to be available

By default, the script assumes you're releasing from the original repository (badlogic/texty). If you're releasing from your own fork:

```bash
export GITHUB_USER="your-github-username"
./publish.sh
```

Alternatively, you can manually create a release:

1. Update the version in `manifest.json`
2. Commit your changes
3. Create and push a new tag:
   ```bash
   git tag v1.0.0  # Use appropriate version
   git push origin v1.0.0
   ```

The GitHub Action will automatically:
- Build extension packages
- Create a GitHub release
- Attach the built packages

## License

BSD 3-Clause License - see LICENSE file for details
