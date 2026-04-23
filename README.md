# Tingly Box For VSCode

<div align="center">

[![License: MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](LICENSE.txt)
[![GitHub Stars](https://img.shields.io/github/stars/tingly-dev/vscode-tingly-box?style=social)](https://github.com/tingly-dev/vscode-tingly-box)

**Bring Your Own Key (BYOK) — True AI Freedom for VSCode**

</div>

> **Transform GitHub Copilot Chat into a universal AI gateway** — Connect any OpenAI or Anthropic compatible provider with your own keys.
>
> Tingly Box for VSCode implements **true BYOK capability**, giving you complete control over your AI infrastructure. No vendor lock-in, no proxy services — direct API connections to the providers you trust.

<div align="center">

![screen-shot](./resource/screenshot.chat.png)

</div>

## What is True BYOK?

**Bring Your Own Key (BYOK)** means you maintain full ownership of your AI infrastructure:

- 🔑 **Your Keys, Your Control** — API keys stored locally in VSCode's secure SecretStorage, never sent to third-party servers
- 🌐 **Direct API Connections** — Extension communicates directly with your chosen AI provider, no intermediaries
- 🏢 **Self-Hosted Friendly** — Use local models, private clouds, or corporate AI deployments
- 🔄 **Seamless Switching** — Switch between providers instantly via status bar dropdown
- 💰 **Cost Transparency** — Pay directly to providers, see actual usage on your provider's dashboard

## Key Features

### 🎯 True BYOK Implementation
- **Direct Provider Integration** — Connect directly to OpenAI, Anthropic, or compatible APIs
- **Secure Local Storage** — API tokens encrypted in VSCode's SecretStorage (never leaves your machine)
- **Status Bar Switcher** — Instantly switch between API styles (OpenAI ↔ Anthropic) via status bar
- **Automatic Model Discovery** — Fetches available models directly from your configured endpoint
- **Transparent Logging** — Full debug logging to see exactly what's being sent and received

### 🚀 VSCode Copilot Chat Integration
- **Native Chat Provider** — Implements VSCode's LanguageModelChatProvider API
- **Streaming Responses** — Real-time streaming with full VSCode chat UI integration
- **Tool Calling Support** — Full support for models with function/tool calling capabilities
- **Model Selection** — Choose from all models available in your configured endpoint

### 🔧 Flexible Configuration
Configure via intuitive webview UI with just three settings per provider:
- **Base URL** — Your API endpoint (e.g., `https://api.openai.com/v1`)
- **Token** — Your API key (stored securely, never shared)
- **API Style** — Choose between `OpenAI` or `Anthropic` message format

### 🌐 Standalone + Tingly Box
- **Works Standalone** — Use directly with any compatible provider
- **Enhanced with Tingly Box** — Integrate with [Tingly Box](https://github.com/tingly-dev/tingly-box) for advanced orchestration

## Quick Start

### 1. Install & Configure

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tingly-dev.vscode-tingly-box)
2. Click the status bar item **"⚠️ Setup Required"** to open configuration
3. Enter your provider details:
   - **Base URL**: Your API endpoint (e.g., `https://api.openai.com/v1`)
   - **Token**: Your API key
   - **API Style**: `OpenAI` or `Anthropic`

<div align="center">

![Configuration Guide](./resource/guide.png) ![Configuration Webview](./resource/webview.png)

</div>

### 2. Switch API Styles (BYOK Feature)

Use the status bar dropdown to instantly switch between API styles:
- Click the status bar showing your current model count
- Select different API style from the dropdown
- Models are automatically fetched from the new endpoint

### 3. Start Chatting

Open GitHub Copilot Chat in VSCode and select a Tingly Box model!

### With Tingly Box (Optional)

For advanced orchestration, start the Tingly Box server:

```bash
npx tingly-box@latest
```

Then use the extension commands to manage it directly from VSCode.

## Commands

| Command                                        | Description                                          |
| ---------------------------------------------- | ---------------------------------------------------- |
| `Tingly Box: Manage Settings`                  | Open configuration webview                           |
| `Tingly Box: Start Server`                     | Start Tingly Box server                              |
| `Tingly Box: Stop Server`                      | Stop Tingly Box server                               |
| `Tingly Box: Open Web UI (System Browser)`     | Open Tingly Box web UI in system browser             |
| `Tingly Box: Open Web UI (Integrated Browser)` | Open Tingly Box web UI in VS Code integrated browser |
| `Tingly Box: Show Status`                      | View current connection status                       |
| `Tingly Box: Fetch Models`                     | Refresh available models from API                    |
| `Tingly Box: Manage Language Models`           | Open VSCode's language model management              |
| `Tingly Box: Reset Configuration`              | Clear all saved configuration                        |

## Status Bar & API Style Switching

The status bar is your BYOK control center:

- **⚠️ Setup Required** — Click to configure your provider
- **✅ N Models [OpenAI]** — Connected with N models, click to switch API style
- **✅ N Models [Anthropic]** — Connected with N models, click to switch API style  
- **⊘ Disconnected** — Configuration exists but connection failed

### Switching API Styles

1. Click the status bar
2. Select your preferred API style from the dropdown
3. The extension automatically:
   - Fetches models from the new endpoint
   - Logs the API call details (enable debug mode to see)
   - Updates the status bar with the new model count

This gives you **instant provider switching** without reconfiguration!

## Settings

### Extension Settings

- `tinglybox.debug` — Enable debug logging in output channel (default: `false`)

### Provider Configuration (BYOK)

Provider settings are configured through the webview UI and stored **securely** in VSCode's SecretStorage:

| Setting       | Description              | Example                     |
| ------------- | ------------------------ | --------------------------- |
| **Base URL**  | Your API endpoint        | `https://api.openai.com/v1` |
| **Token**     | Your API key (encrypted) | `sk-...`                    |
| **API Style** | Message format           | `OpenAI` or `Anthropic`     |

> **Security Note**: Your API token is stored locally using VSCode's SecretStorage and is never transmitted to any server other than your configured Base URL.

## BYOK Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   VSCode Chat   │────────▶│ Tingly Box       │────────▶│ Your API        │
│   (Copilot)     │◀────────│ Extension        │◀────────│ Endpoint         │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │ SecretStorage│
                            │ (Your Token) │
                            └──────────────┘
```

**Key BYOK Guarantees:**

- ✅ **Direct Connection** — Extension → Your API (no proxies)
- ✅ **Local Storage** — Tokens in VSCode SecretStorage only
- ✅ **No Telemetry** — No usage data sent to third parties
- ✅ **Open Source** — Full code transparency (MPL-2.0)
- ✅ **Multi-Provider** — Switch between any OpenAI/Anthropic compatible API

## Supported Providers

### OpenAI-Compatible APIs
Set API Style to `OpenAI`:
- OpenAI (GPT-4o, GPT-4, GPT-3.5)
- Azure OpenAI
- Together AI
- Groq
- Anyscale
- Any OpenAI-compatible endpoint

### Anthropic-Compatible APIs
Set API Style to `Anthropic`:
- Anthropic Claude (Sonnet, Opus, Haiku)
- Any Anthropic-compatible endpoint

### Self-Hosted & Corporate
- Local LLM deployments (Ollama, LocalAI, etc.)
- Corporate AI gateways
- Custom proxies

## Troubleshooting

### Connection Issues
- **Check Base URL** — Ensure it includes the path (e.g., `/v1` for OpenAI)
- **Verify Token** — Confirm your API key is valid and has required permissions
- **Test Connection** — Use "Fetch Models" command to validate connectivity
- **Enable Debug** — Set `tinglybox.debug: true` and check "Tingly Box" output channel

### Models Not Appearing
1. **Fetch Models** — Run `Tingly Box: Fetch Models` command
2. **Check Logs** — Enable debug mode to see API responses
3. **Verify Endpoint** — Ensure your provider supports the `/models` endpoint

### API Style Switching Not Working
- Ensure both API styles are configured with valid endpoints
- Check the output channel for fetch errors
- Try fetching models manually after switching

### Status Bar Shows Disconnected
- Your provider may be temporarily unavailable
- Check your Base URL is accessible
- Verify your token hasn't expired

## Requirements

- **VS Code 1.104.0+** — For LanguageModelChatProvider API support
- **API Key** — From your chosen AI provider (stored locally, never shared)

## Why Tingly Box For VSCode?

| Feature               | Tingly Box Extension              | Copilot Official | Other Extensions    |
| --------------------- | --------------------------------- | ---------------- | ------------------- |
| **BYOK Support**      | ✅ True BYOK                       | ❌                | ⚠️ Limited           |
| **Direct API**        | ✅ Yes                             | ❌                | ⚠️ Often via proxy   |
| **Multi-Provider**    | ✅ OpenAI + Anthropic + compatible | ❌                | ⚠️ Provider-specific |
| **Self-Hosted**       | ✅ Yes                             | ❌                | ⚠️ Rare              |
| **Open Source**       | ✅ MPL-2.0                         | ❌                | ⚠️ Varies            |
| **Local Storage**     | ✅ SecretStorage                   | ❌                | ⚠️ Cloud sync        |
| **Status Bar Switch** | ✅ Instant API style switch        | N/A              | ❌                   |
| **Transparent**       | ✅ Full debug logging              | ❌                | ⚠️ Black box         |

## License

This project is open source under the [MPL-2.0 License](LICENSE.txt).

**What this means:**
- ✅ Free to use for personal and commercial projects
- ✅ Free to modify and extend
- ✅ Free to distribute (with proper attribution)
- ✅ Patent protections included
- ✅ File-level copying: You can combine it with other code under compatible licenses

See [LICENSE.txt](LICENSE.txt) for full details.

## Acknowledgments

Built with:
- [OpenAI SDK](https://github.com/openai/openai-node) — OpenAI API client
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) — Anthropic API client
- [VS Code Extension API](https://code.visualstudio.com/api) — LanguageModelChatProvider

---

**Tingly Box: Your AI, Your Keys, Your Control** 🚀

## Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tingly-dev.vscode-tingly-box)
- [Source Code](https://github.com/tingly-dev/vscode-tingly-box)
- [Report Issues](https://github.com/tingly-dev/vscode-tingly-box/issues)
- [Tingly Box](https://github.com/tingly-dev/tingly-box)
