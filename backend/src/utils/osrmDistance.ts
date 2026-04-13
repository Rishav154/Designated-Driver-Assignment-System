// OSRM (Open Source Routing Machine) Distance Calculator
// Uses the public OSRM demo server for routing
// Returns: { distanceKm: number, durationSeconds: number }
// On failure, throws an error with message "OSRM_API_ERROR"
// Note: OSRM coordinate order is longitude,latitude

export async function osrmDistance(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) {
    try {
        const coords = `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}`
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            headers: { 'User-Agent': 'SafeRide-DesignatedDriver/1.0' },
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
            const errText = await response.text()
            console.error('OSRM route error:', response.status, errText)
            throw new Error("OSRM_API_ERROR")
        }

        const data = await response.json()

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.error('OSRM unexpected response:', JSON.stringify(data).substring(0, 500))
            throw new Error("OSRM_API_ERROR")
        }

        const route = data.routes[0]
        // distance is in meters, convert to km
        const distanceKm = route.distance / 1000
        const durationSeconds = route.duration

        return { distanceKm, durationSeconds }
    } catch (error: any) {
        console.error('OSRM distance error:', error.message)
        throw new Error("OSRM_API_ERROR")
    }
}
