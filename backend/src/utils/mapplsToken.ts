// Mappls OAuth 2.0 Token Manager
// Generates and caches bearer tokens using client_id + client_secret
// Token endpoint: POST https://outpost.mappls.com/api/security/oauth/token
// Falls back to REST key if OAuth fails

let cachedToken: string | null = null
let tokenExpiry: number = 0

export async function getMapplsToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60_000) {
        return cachedToken
    }

    const clientId = process.env.MAPPLS_CLIENT_ID
    const clientSecret = process.env.MAPPLS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        // Fall back to REST key
        const restKey = process.env.MAPPLS_REST_KEY
        if (restKey) {
            console.log('Mappls: Using REST key as fallback (no client_id/secret)')
            return restKey
        }
        throw new Error('No Mappls credentials configured')
    }

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const response = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
            }),
            signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
            const errText = await response.text()
            console.error('Mappls token error:', response.status, errText)
            throw new Error('MAPPLS_TOKEN_ERROR')
        }

        const data = await response.json()
        cachedToken = data.access_token
        // Default 24h expiry, but use expires_in if provided
        const expiresIn = data.expires_in || 86400
        tokenExpiry = Date.now() + expiresIn * 1000

        console.log('Mappls OAuth token acquired, expires in', expiresIn, 'seconds')
        return cachedToken!
    } catch (error: any) {
        console.error('Mappls OAuth failed:', error.message, '- falling back to REST key')
        // Fall back to REST key
        const restKey = process.env.MAPPLS_REST_KEY
        if (restKey) {
            return restKey
        }
        throw new Error('No Mappls credentials available')
    }
}

// Returns true if the token was obtained via OAuth, false if it's a static REST key
export function isOAuthToken(token: string): boolean {
    // OAuth tokens are UUIDs like "0XXXXXXf-dXX0-4XX0-8XXa-eXXXXXXXXXX6"
    // REST keys are longer alphanumeric strings
    return token.includes('-') && token.length < 50
}
