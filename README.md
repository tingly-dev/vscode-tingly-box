# Tingly Box For VSCode

<div align="center">

[![License: MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](LICENSE.txt)
[![GitHub Stars](https://img.shields.io/github/stars/tingly-dev/vscode-tingly-box?style=social)](https://github.com/tingly-dev/vscode-tingly-box)

**Bring Your Own Key (BYOK) — True AI Freedom for VSCode**

</div>

Transform GitHub Copilot Chat into a universal AI gateway. Connect any OpenAI or Anthropic compatible provider with your own keys — no vendor lock-in, no proxies, direct API connections.

<div align="center">

![screen-shot](./resource/screenshot.chat.png)

</div>

## Why BYOK?

- 🔑 **Your Keys** — Stored locally in VSCode's SecretStorage
- 🌐 **Direct API** — Extension → Your provider (no intermediaries)
- 🔄 **Instant Switch** — Change providers via status bar
- 🏢 **Self-Hosted** — Use local models, private clouds

## Features

- **Status Bar Switcher** — Instantly switch between OpenAI ↔ Anthropic API styles
- **Secure Storage** — Tokens encrypted in VSCode's SecretStorage
- **Model Discovery** — Auto-fetch models from your endpoint
- **Streaming & Tools** — Full chat streaming and tool calling support

## Quick Start

1. Install extension from [Marketplace](https://marketplace.visualstudio.com/items?itemName=tingly-dev.vscode-tingly-box)
2. Click status bar **"⚠️ Setup Required"**
3. Configure:
   - **Base URL**: `https://api.openai.com/v1`
   - **Token**: Your API key
   - **API Style**: `OpenAI` or `Anthropic`
4. Start chatting in Copilot Chat!

<div align="center">

![guide](./resource/guide.png) ![webview](./resource/webview.png)

</div>

### Switch API Styles

Click status bar → Select API style → Models auto-fetch

## Commands

| Command                         | Description                |
| ------------------------------- | -------------------------- |
| `Tingly Box: Manage Settings`   | Open configuration webview |
| `Tingly Box: Fetch Models`      | Refresh models from API    |
| `Tingly Box: Start/Stop Server` | Manage Tingly Box server   |
| `Tingly Box: Show Status`       | View connection status     |

## Status Bar

- **⚠️ Setup Required** — Click to configure
- **✅ N Models [OpenAI]** — Connected, click to switch style
- **✅ N Models [Anthropic]** — Connected, click to switch style
- **⊘ Disconnected** — Connection failed

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

**Key Guarantees**: Direct connection • Local storage • No telemetry • Open source (MPL-2.0)

## Supported Providers

**OpenAI Style**: OpenAI, Azure, Together, Groq, Anyscale, any `/v1` compatible
**Anthropic Style**: Anthropic Claude, any Anthropic compatible
**Self-Hosted**: Ollama, LocalAI, corporate gateways

## Why Tingly Box?

| Feature        | Tingly Box           | Copilot | Others     |
| -------------- | -------------------- | ------- | ---------- |
| BYOK Support   | ✅ True BYOK          | ❌       | ⚠️ Limited  |
| Direct API     | ✅ Yes                | ❌       | ⚠️ Proxy    |
| Multi-Provider | ✅ OpenAI + Anthropic | ❌       | ⚠️ Specific |
| Self-Hosted    | ✅ Yes                | ❌       | ⚠️ Rare     |
| Open Source    | ✅ MPL-2.0            | ❌       | ⚠️ Varies   |
| Local Storage  | ✅ SecretStorage      | ❌       | ⚠️ Cloud    |
| Status Switch  | ✅ Instant            | N/A     | ❌          |

## Settings

- `tinglybox.debug` — Enable debug logging (default: `false`)

## Troubleshooting

- **Connection failed** → Check Base URL includes `/v1`, verify token
- **No models** → Run "Fetch Models" command
- **Switch not working** → Ensure both API styles configured

## Requirements

- VS Code 1.104.0+
- API key from your provider

## License

[MPL-2.0](LICENSE.txt) — Free for personal and commercial use

---

**Tingly Box: Your AI, Your Keys, Your Control** 🚀

[Marketplace](https://marketplace.visualstudio.com/items?itemName=tingly-dev.vscode-tingly-box) • [GitHub](https://github.com/tingly-dev/vscode-tingly-box) • [Issues](https://github.com/tingly-dev/vscode-tingly-box/issues)
