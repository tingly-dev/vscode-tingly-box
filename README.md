# Tingly Box For VSCode

**Tingly Box For VS Code** — Orchestrate your Copilot Chat with custom AI models powered by **Tingly Box**, or use standalone with OpenAI, Anthropic, and any compatible providers.

> Tingly Box: **Your intelligence, orchestrated** — AI Intelligence Orchestration for Solo Builders and Dev Teams
> 
> https://github.com/tingly-dev/tingly-box

![screen-shot](./resource/screenshot.chat.png)
![screen-shot](./resource/screenshot.inline.png)

## Features

### Works with Tingly Box
This extension is designed to integrate seamlessly with [Tingly Box](https://github.com/tingly-dev/tingly-box) — your AI intelligence orchestration platform. Together, they provide a unified AI experience for solo builders and dev teams.

- **One-Click Server Control** — Start and stop Tingly Box server directly from the extension
- **Automatic Setup** — Built-in server management for hassle-free configuration
- **Unified AI Experience** — Connect to Tingly Box for orchestrated AI capabilities

### Standalone Capabilities
Works perfectly on its own too:

- **Multi-Provider Support** — Native support for OpenAI and Anthropic APIs, plus any OpenAI-compatible or Anthropic-compatible endpoints
- **Custom Endpoints** — Connect to self-hosted models, proxies, or any OpenAI/Anthropic-compatible API
- **Streaming Responses** — Real-time streaming chat responses with full VS Code integration
- **Vision Support** — Models with image input capabilities (like Claude Sonnet and GPT-4V) work seamlessly
- **Tool Calling** — Full support for models with function/tool calling capabilities
- **Status Bar Indicator** — Shows connection status and available model count at a glance
- **Secure Credential Storage** — API tokens stored securely in VS Code's SecretStorage
- **Model Discovery** — Automatically fetches available models from your configured endpoints
- **Webview Configuration UI** — Modern, intuitive interface for managing your settings

## Quick Start

### Using with Tingly Box (Recommended)

Install plugin and click status bar to open tingly box for vscode config webview and follow the guide.

![alt text](./resource/guide.png)

1. Install the VSCode extension
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run `Tingly Box: Manage Settings`
3. In the **"Using with Tingly Box"** tab, click **"🚀 Start"** to launch the Tingly Box server
4. Enter your Tingly Box URL (default: `http://localhost:12580/tingly/openai`)
5. Select your API Style (OpenAI or Anthropic — either works with Tingly Box)
6. Save and start chatting!

> **Note**: You can also start Tingly Box manually by running `npx tingly-box@latest` in your terminal.

### Using with Custom Providers

1. Install the extension from the VS Code Marketplace
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run `Tingly Box: Manage Settings`
3. Configure your provider:
   - **Base URL**: Your API endpoint (e.g., `https://api.openai.com/v1/`)
   - **Token**: Your API key
   - **API Style**: Choose between `OpenAI` or `Anthropic` format
4. Click "Test Connection" to verify your setup
5. Save and start chatting!

> **Note**: Custom providers must support the `/models` endpoint for automatic model discovery.

## Commands

| Command                              | Description                             |
| ------------------------------------ | --------------------------------------- |
| `Tingly Box: Manage Settings`        | Open configuration webview              |
| `Tingly Box: Start Server`           | Start Tingly Box server                 |
| `Tingly Box: Stop Server`            | Stop Tingly Box server                  |
| `Tingly Box: Open Web UI`            | Open Tingly Box web control panel       |
| `Tingly Box: Show Status`            | View current connection status          |
| `Tingly Box: Fetch Models`           | Refresh available models from API       |
| `Tingly Box: Manage Language Models` | Open VSCode's language model management |
| `Tingly Box: Reset Configuration`    | Clear all saved configuration           |

## Status Bar

The extension adds a status bar item that shows:
- **⚠️ Setup Required** — Not configured, click to setup
- **✅ N Models** — Connected with N models available
- **⊘ Disconnected** — Configuration exists but connection failed

Click the status bar to quickly open the configuration webview.

## Settings

### VSCode Settings

- `tinglybox.debug` — Enable debug logging in output channel (default: `false`)

### Provider Configuration

Provider settings are configured through the webview UI and stored securely in VSCode's SecretStorage:

- **Base URL** — Your API endpoint (required)
- **Token** — API authentication token (optional)
- **API Style** — Message format: `OpenAI` or `Anthropic` (required)

## Supported Providers

### OpenAI-Compatible
- OpenAI (GPT-4, GPT-3.5, etc.)
- Azure OpenAI
- Any OpenAI-compatible endpoint

### Anthropic-Compatible
- Anthropic Claude (Sonnet, Opus, Haiku)
- Any Anthropic-compatible endpoint

### Recommendation

While you can use custom providers directly, we strongly recommend using [Tingly Box](https://github.com/tingly-dev/tingly-box) for the best experience:

- **Provider Compatibility** — Handles API differences between providers
- **Model Discovery** — Automatic model list fetching and caching
- **Seamless Switching** — Easy switching between providers and API styles
- **Unified Interface** — Single configuration for all your AI needs

Using the plugin independently requires your provider to guarantee API compatibility.

## Troubleshooting

### Connection Issues
- Check your Base URL is correct and accessible
- Verify your token if authentication is required
- Use "Test Connection" in the settings to diagnose issues
- Enable `tinglybox.debug` to see detailed logs in the output channel

### Models Not Showing
- Ensure your provider supports the `/models` endpoint
- Try "Fetch Models" command to refresh the model list
- Check the output channel for error messages

### Status Bar Shows Disconnected
- Your provider may be temporarily unavailable
- Check your network connection
- Verify your configuration is correct

## Requirements

- VS Code 1.104.0 or higher
- An API key from your chosen provider (if required)

## License

[MPL-2.0](LICENSE.txt)

## Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tingly-dev.vscode-tingly-box)
- [Source Code](https://github.com/tingly-dev/vscode-tingly-box)
- [Report Issues](https://github.com/tingly-dev/vscode-tingly-box/issues)
- [Tingly Box](https://github.com/tingly-dev/tingly-box)
