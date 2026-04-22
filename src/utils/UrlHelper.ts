/**
 * URL utility functions
 */

/**
 * Parsed Tingly Box web UI URL info
 */
export interface TinglyBoxUrlInfo {
    /** Full web UI URL with token parameter */
    fullUrl: string;
    /** Base server URL without query params */
    baseUrl: string;
    /** Web UI access token (NOT for API use) */
    webToken: string;
    /** Server port */
    port: number;
}

/**
 * Build API endpoint URL by handling base URL path correctly
 * Detects if baseUrl already includes a path and handles appropriately
 *
 * Examples:
 * - buildApiUrl('https://api.example.com', 'models') → 'https://api.example.com/models'
 * - buildApiUrl('https://api.example.com/', 'models') → 'https://api.example.com/models'
 * - buildApiUrl('https://api.example.com/v1', 'models') → 'https://api.example.com/v1/models'
 * - buildApiUrl('https://api.example.com/v1/', 'models') → 'https://api.example.com/v1/models'
 * - buildApiUrl('https://api.example.com/v1/chat', 'completions') → 'https://api.example.com/v1/chat/completions'
 *
 * @param baseUrl - The base URL from configuration
 * @param endpoint - The endpoint path (e.g., 'models', 'chat/completions')
 * @returns Full URL string
 */
export function buildApiUrl(baseUrl: string, endpoint: string): string {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    return `${cleanBaseUrl}/${cleanEndpoint}`;
}

/**
 * Parse Tingly Box web UI URL to extract components
 * @param url Full URL like "http://localhost:12580/?token=tb-user-xxx"
 * @returns Parsed URL components or null if invalid
 */
export function parseTinglyBoxUrl(url: string): TinglyBoxUrlInfo | null {
    try {
        const urlObj = new URL(url);
        const webToken = urlObj.searchParams.get('token');

        if (!webToken || !webToken.startsWith('tb-user-')) {
            return null;
        }

        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        const port = parseInt(urlObj.port) || (urlObj.protocol === 'https:' ? 443 : 80);

        return {
            fullUrl: url,
            baseUrl,
            webToken,
            port,
        };
    } catch {
        return null;
    }
}

/**
 * Extract Tingly Box web UI URL from server output text
 * @param output Raw server stdout text
 * @returns Parsed URL info or null if not found
 */
export function extractFromServerOutput(output: string): TinglyBoxUrlInfo | null {
    // Match URL pattern: http(s)://host:port/?token=tb-user-{hex}
    const urlPattern = /(https?:\/\/[^\s"']+?\?token=tb-user-[a-f0-9]+)/i;
    const match = output.match(urlPattern);

    if (!match) {
        return null;
    }

    return parseTinglyBoxUrl(match[1]);
}

/**
 * Mask the web UI token in a URL for safe logging
 * @param url URL containing tb-user- token
 * @returns URL with token masked
 */
export function maskToken(url: string): string {
    return url.replace(/(token=tb-user-)[a-f0-9]+/i, '$1***');
}
