/**
 * URL utility functions
 */

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
