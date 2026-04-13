import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.ts'
import { getMapplsToken, isOAuthToken } from '../utils/mapplsToken.ts'

const router = Router()

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const NOMINATIM_HEADERS = { 'User-Agent': 'SafeRide-DesignatedDriver/1.0' }

// GET /api/maps/autosuggest?query=<text>&lat=<lat>&lng=<lng>
// Still uses Mappls for autosuggest (works fine on standard plan)
router.get('/autosuggest', requireAuth, async (req, res) => {
    const { query, lat, lng } = req.query

    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' })
    }

    try {
        const token = await getMapplsToken()

        let url: string
        let headers: Record<string, string> = {}

        if (isOAuthToken(token)) {
            const params = new URLSearchParams({
                query: query as string,
                region: 'IND',
            })
            if (lat && lng) {
                params.set('location', `${lat},${lng}`)
            }
            url = `https://atlas.mappls.com/api/places/search/json?${params.toString()}`
            headers['Authorization'] = `Bearer ${token}`
        } else {
            url = `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query as string)}&region=IND&access_token=${token}`
            if (lat && lng) {
                url += `&location=${lat},${lng}`
            }
        }

        console.log('Fetching Mappls autosuggest:', url.replace(token, '***'))

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            headers,
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
            const errText = await response.text()
            console.error('Mappls autosuggest error:', response.status, errText)
            return res.status(response.status).json({ error: 'Mappls API error', details: errText })
        }

        const data = await response.json()
        res.json(data.suggestedLocations || [])
    } catch (error: any) {
        console.error('Autosuggest fetch error:', error.message)
        res.status(500).json({ error: 'Failed to fetch suggestions' })
    }
})

// GET /api/maps/reverse-geocode?lat=<lat>&lng=<lng>
// Uses Nominatim reverse geocoding (free, no API key needed)
router.get('/reverse-geocode', requireAuth, async (req, res) => {
    const { lat, lng } = req.query

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Missing lat or lng parameters' })
    }

    try {
        const url = `${NOMINATIM_BASE}/reverse?${new URLSearchParams({
            lat: lat as string,
            lon: lng as string,
            format: 'json',
        })}`

        console.log('Fetching Nominatim reverse-geocode:', url)

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            headers: NOMINATIM_HEADERS,
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
            const errText = await response.text()
            console.error('Nominatim reverse-geocode error:', response.status, errText)
            return res.status(response.status).json({ error: 'Geocoding API error' })
        }

        const data = await response.json()
        if (data.display_name) {
            res.json({
                address: data.display_name,
                city: data.address?.city || data.address?.town || data.address?.village || '',
                state: data.address?.state || ''
            })
        } else {
            res.status(404).json({ error: 'No address found' })
        }
    } catch (error: any) {
        console.error('Reverse-geocode fetch error:', error.message)
        res.status(500).json({ error: 'Failed to fetch reverse geocode' })
    }
})

// GET /api/maps/my-location
// IP-based geolocation fallback — used when browser location is unavailable/denied
// Uses ipapi.co for IP coordinates, then Nominatim for address
router.get('/my-location', requireAuth, async (req, res) => {
    try {
        // Get IP from request (handle proxies)
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || ''

        // Skip loopback IPs (local dev) — ipapi.co auto-detects client IP when blank
        const ipParam = ip === '::1' || ip.startsWith('127.') ? '' : `/${ip}`

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const ipRes = await fetch(`https://ipapi.co${ipParam}/json/`, {
            headers: { 'User-Agent': 'SafeRide-DesignatedDriver/1.0' },
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!ipRes.ok) {
            return res.status(502).json({ error: 'Failed to get IP location' })
        }

        const ipData = await ipRes.json()
        const lat = ipData.latitude?.toString()
        const lng = ipData.longitude?.toString()

        if (!lat || !lng) {
            return res.status(404).json({ error: 'Could not determine location from IP' })
        }

        // Reverse geocode the IP coordinates with Nominatim
        const revController = new AbortController()
        const revTimeout = setTimeout(() => revController.abort(), 8000)

        const revRes = await fetch(`${NOMINATIM_BASE}/reverse?${new URLSearchParams({
            lat, lon: lng, format: 'json',
        })}`, { headers: NOMINATIM_HEADERS, signal: revController.signal })
        clearTimeout(revTimeout)

        const revData = await revRes.json()

        res.json({
            lat,
            lng,
            address: revData.display_name || `${lat}, ${lng}`,
            city: revData.address?.city || revData.address?.town || '',
            state: revData.address?.state || '',
        })
    } catch (error: any) {
        console.error('IP geolocation error:', error.message)
        res.status(500).json({ error: 'Failed to determine location' })
    }
})

// GET /api/maps/geocode?address=<text>
// Uses Nominatim forward geocoding to convert an address/place name to coordinates
router.get('/geocode', requireAuth, async (req, res) => {
    const { address } = req.query

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid address parameter' })
    }

    try {
        const url = `${NOMINATIM_BASE}/search?${new URLSearchParams({
            q: address,
            format: 'json',
            limit: '1',
            countrycodes: 'in',
        })}`

        console.log('Fetching Nominatim geocode for:', address)

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            headers: NOMINATIM_HEADERS,
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
            const errText = await response.text()
            console.error('Nominatim geocode error:', response.status, errText)
            return res.status(response.status).json({ error: 'Geocoding API error', details: errText })
        }

        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
            const result = data[0]
            return res.json({
                latitude: result.lat,
                longitude: result.lon,
                displayName: result.display_name,
                coordinatesAvailable: true,
            })
        }

        return res.json({
            latitude: null,
            longitude: null,
            displayName: null,
            coordinatesAvailable: false,
        })
    } catch (error: any) {
        console.error('Geocode fetch error:', error.message)
        return res.json({
            latitude: null,
            longitude: null,
            displayName: null,
            coordinatesAvailable: false,
        })
    }
})

// GET /api/maps/place?eloc=<eloc>
// Legacy endpoint — now uses Nominatim forward geocoding via the place name
// Kept for backward compatibility; frontend will gradually switch to /geocode
router.get('/place', requireAuth, async (req, res) => {
    let { eloc, placeName } = req.query

    if (!eloc && !placeName) {
        return res.status(400).json({ error: 'Missing eloc or placeName parameter' })
    }

    // If we have a placeName, use Nominatim directly
    const searchQuery = (placeName as string) || (eloc as string)

    try {
        const url = `${NOMINATIM_BASE}/search?${new URLSearchParams({
            q: searchQuery,
            format: 'json',
            limit: '1',
            countrycodes: 'in',
        })}`

        console.log('Fetching Nominatim geocode for place:', searchQuery)

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            headers: NOMINATIM_HEADERS,
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
            console.warn('Nominatim geocode failed for:', searchQuery)
            return res.json({
                latitude: null,
                longitude: null,
                formattedAddress: null,
                coordinatesAvailable: false,
            })
        }

        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
            const result = data[0]
            return res.json({
                latitude: result.lat,
                longitude: result.lon,
                formattedAddress: result.display_name,
                coordinatesAvailable: true,
            })
        }

        return res.json({
            latitude: null,
            longitude: null,
            formattedAddress: null,
            coordinatesAvailable: false,
        })
    } catch (error: any) {
        console.error('Place geocode fetch error:', error.message)
        return res.json({
            latitude: null,
            longitude: null,
            formattedAddress: null,
            coordinatesAvailable: false,
        })
    }
})

export default router