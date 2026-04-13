// Calls Mappls Distance Matrix API to get road distance in km and duration in seconds
// Supports both OAuth bearer token and static key auth
// Returns: { distanceKm: number, durationSeconds: number }
// On failure, throw an error with message "MAPPLS_API_ERROR"
// Note: Mappls coordinate order is longitude,latitude (not lat,lng)

import { getMapplsToken, isOAuthToken } from './mapplsToken.ts'

export async function mapplsDistance(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) {
    try {
        const token = await getMapplsToken()
        const coords = `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}`

        let url: string
        let headers: Record<string, string> = {}

        if (isOAuthToken(token)) {
            url = `https://apis.mappls.com/advancedmaps/v1/distance_matrix/driving/${coords}`
            headers['Authorization'] = `Bearer ${token}`
        } else {
            url = `https://apis.mappls.com/advancedmaps/v1/${token}/distance_matrix/driving/${coords}`
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            headers,
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
            const errText = await response.text()
            console.error('Mappls distance matrix error:', response.status, errText)
            throw new Error("MAPPLS_API_ERROR")
        }

        const data = await response.json()

        if (data.responseCode !== 200 || !data.results || !data.results.distances || !data.results.durations) {
            console.error('Mappls distance matrix unexpected response:', JSON.stringify(data).substring(0, 500))
            throw new Error("MAPPLS_API_ERROR")
        }

        // distances[0][1] -> from point 0 to point 1. distance in meters, convert to km
        const distanceKm = data.results.distances[0][1] / 1000
        const durationSeconds = data.results.durations[0][1]

        return { distanceKm, durationSeconds }
    } catch (error: any) {
        console.error('Mappls distance error:', error.message)
        throw new Error("MAPPLS_API_ERROR")
    }
}
