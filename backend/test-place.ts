import dotenv from 'dotenv'
import { getMapplsToken, isOAuthToken } from './src/utils/mapplsToken.ts'

dotenv.config()

async function testPlace(eloc: string) {
    try {
        const token = await getMapplsToken()
        let url: string
        let headers: Record<string, string> = {}

        if (isOAuthToken(token)) {
            url = `https://atlas.mappls.com/api/places/geocode?address=${eloc}`
            headers['Authorization'] = `Bearer ${token}`
        } else {
            url = `https://atlas.mappls.com/api/places/geocode?address=${eloc}&access_token=${token}`
        }

        console.log('Fetching URL:', url.replace(token, '***'))

        const response = await fetch(url, { headers })
        const data = await response.json()
        console.log('Response:', JSON.stringify(data, null, 2))

        // Test parsing
        let latitude: string | null = null
        let longitude: string | null = null

        if (data.copResults && data.copResults.length > 0) {
            latitude = data.copResults[0].latitude?.toString()
            longitude = data.copResults[0].longitude?.toString()
        } else if (Array.isArray(data) && data.length > 0) {
            latitude = (data[0].latitude || data[0].lat)?.toString()
            longitude = (data[0].longitude || data[0].lng)?.toString()
        } else if (data.latitude || data.lat) {
            latitude = (data.latitude || data.lat)?.toString()
            longitude = (data.longitude || data.lng)?.toString()
        }

        console.log('Parsed coordinates:', { latitude, longitude })

    } catch (e: any) {
        console.error('Error:', e.message)
    }
}

// Test with a sample eLoc (e.g. MapmyIndia Head Office eLoc: mmi000 or any generic one)
testPlace('mmi000')
