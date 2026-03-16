# Tingly Box For VSCode

Tinlgy Box VSCode Extension, connect VS Code Chat to [Tingly Box](https://github.com/tingly-dev/tingly-box) for a unified AI experience, or use standalone with OpenAI, Anthropic, and any OpenAI/Anthropic-compatible APIs.

> Tingly Box: **Your intelligence, orchestrated** — AI Intelligence Orchestration for Solo Builders and Dev Teams

![screen-shot](./resource/ScreenShot.png)

## Features

### Works with Tingly Box
This extension is designed to integrate seamlessly with [Tingly Box](https://github.com/tingly-dev/tingly-box) — your AI intelligence orchestration platform. Together, they provide a unified AI experience for solo builders and dev teams.

### Standalone Capabilities
Works perfectly on its own too:

- **Multi-Provider Support** — Native support for OpenAI and Anthropic APIs, plus any OpenAI-compatible or Anthropic-compatible endpoints
- **Custom Endpoints** — Connect to self-hosted models, proxies, or any OpenAI/Anthropic-compatible API
- **Streaming Responses** — Real-time streaming chat responses with full VS Code integration
- **Vision Support** — Models with image input capabilities (like Claude Sonnet and GPT-4V) work seamlessly
- **Tool Calling** — Full support for models with function/tool calling capabilities
- **Status Bar Indicator** — Quick view of your active provider and API style
- **Secure Credential Storage** — API tokens stored securely in VS Code's SecretStorage
- **Model Discovery** — Automatically fetches available models from your configured endpoints

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run `Tingly Box VSCode: Manage Settings`
3. Configure your provider:
   - **Base URL**: Your API endpoint (e.g., `https://api.openai.com/v1/` or a custom endpoint)
   - **Token**: Your API key
   - **API Style**: Choose between `anthropic` or `openai` format
4. Start chatting with AI in VS Code!

## Commands

| Command                                   | Description                    |
| ----------------------------------------- | ------------------------------ |
| `Tingly Box VSCode: Manage Settings`      | Open configuration UI          |
| `Tingly Box VSCode: Show Provider Status` | View current connection status |
| `Tingly Box VSCode: Fetch Models`         | Refresh available models       |
| `Tingly Box VSCode: Toggle API Style`     | Switch between API styles      |

## Settings

- `tinglybox.debug` — Enable debug logging in output channel (default: `false`)

## Supported Providers

### OpenAI-Compatible
- OpenAI (GPT-4, GPT-3.5, etc.)
- Azure OpenAI
- Any OpenAI-compatible endpoint

### Anthropic-Compatible
- Anthropic Claude (Sonnet, Opus, Haiku)
- Any Anthropic-compatible endpoint

### Mention
It is recommended to use with Tingly Box, which provides continuous compatibility support.
Using the plugin independently requires the vendor to provide guarantees.

## Requirements

- VS Code 1.104.0 or higher
- An API key from your chosen provider

## License

[MPL-2.0](LICENSE.txt)

## Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tingly-dev.vscode-tingly-box)
- [Source Code](https://github.com/tingly-dev/vscode-tingly-box)
- [Report Issues](https://github.com/tingly-dev/vscode-tingly-box/issues)
