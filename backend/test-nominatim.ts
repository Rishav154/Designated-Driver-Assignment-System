// Quick test script for OpenStreetMap Nominatim API
// Run: npx tsx test-nominatim.ts

async function testForwardGeocode(address: string) {
    console.log(`\n--- Forward Geocode: "${address}" ---`)
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
    })}`

    const response = await fetch(url, {
        headers: { 'User-Agent': 'SafeRide-DesignatedDriver/1.0' },
    })
    const data = await response.json()
    if (data.length > 0) {
        console.log('Result:', {
            displayName: data[0].display_name,
            latitude: data[0].lat,
            longitude: data[0].lon,
        })
    } else {
        console.log('No results found')
    }
}

async function testReverseGeocode(lat: string, lon: string) {
    console.log(`\n--- Reverse Geocode: ${lat}, ${lon} ---`)
    const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
        lat,
        lon,
        format: 'json',
    })}`

    const response = await fetch(url, {
        headers: { 'User-Agent': 'SafeRide-DesignatedDriver/1.0' },
    })
    const data = await response.json()
    console.log('Result:', {
        displayName: data.display_name,
        address: data.address,
    })
}

async function main() {
    // Test forward geocoding
    await testForwardGeocode('Connaught Place, New Delhi, India')
    await testForwardGeocode('India Gate, New Delhi')

    // Test reverse geocoding (India Gate coordinates)
    await testReverseGeocode('28.6129', '77.2295')
}

main().catch(console.error)
