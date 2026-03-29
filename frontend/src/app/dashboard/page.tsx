'use client'
import { useAuth, useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getApi } from '@/lib/api'

export default function Dashboard() {
    const { getToken } = useAuth()
    const { user } = useUser()
    const router = useRouter()

    const [pickup, setPickup] = useState({ address: '', lat: '', lng: '' })
    const [dropoff, setDropoff] = useState({ address: '', lat: '', lng: '' })
    const [fare, setFare] = useState<number | null>(null)
    const [distance, setDistance] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getApi(getToken).then(api =>
            api.get('/api/auth/me').then(res => {
                if (res.data.role === 'DRIVER') router.push('/driver/dashboard')
            })
        )
    }, [])

    async function estimateFare() {
        const api = await getApi(getToken)
        const res = await api.post('/api/rides/estimate', {
            pickupLat: parseFloat(pickup.lat),
            pickupLng: parseFloat(pickup.lng),
            dropoffLat: parseFloat(dropoff.lat),
            dropoffLng: parseFloat(dropoff.lng),
        })
        setFare(res.data.fare)
        setDistance(res.data.distance)
    }

    async function bookRide() {
        setLoading(true)
        const api = await getApi(getToken)
        const res = await api.post('/api/rides/book', {
            pickupAddress: pickup.address,
            dropoffAddress: dropoff.address,
            pickupLat: parseFloat(pickup.lat),
            pickupLng: parseFloat(pickup.lng),
            dropoffLat: parseFloat(dropoff.lat),
            dropoffLng: parseFloat(dropoff.lng),
        })
        router.push(`/rides/${res.data.id}/waiting`)
    }

    return (
        <div className="min-h-screen p-8 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-2">Welcome, {user?.firstName}!</h1>
            <p className="text-gray-500 mb-8">Book a designated driver</p>

            <div className="flex flex-col gap-4">
                <div className="border rounded-lg p-4 flex flex-col gap-2">
                    <h2 className="font-semibold">Pickup</h2>
                    <input className="border p-2 rounded" placeholder="Address"
                        onChange={e => setPickup(p => ({ ...p, address: e.target.value }))} />
                    <div className="flex gap-2">
                        <input className="border p-2 rounded w-full" placeholder="Latitude (e.g. 28.6139)"
                            onChange={e => setPickup(p => ({ ...p, lat: e.target.value }))} />
                        <input className="border p-2 rounded w-full" placeholder="Longitude (e.g. 77.2090)"
                            onChange={e => setPickup(p => ({ ...p, lng: e.target.value }))} />
                    </div>
                </div>

                <div className="border rounded-lg p-4 flex flex-col gap-2">
                    <h2 className="font-semibold">Dropoff</h2>
                    <input className="border p-2 rounded" placeholder="Address"
                        onChange={e => setDropoff(p => ({ ...p, address: e.target.value }))} />
                    <div className="flex gap-2">
                        <input className="border p-2 rounded w-full" placeholder="Latitude"
                            onChange={e => setDropoff(p => ({ ...p, lat: e.target.value }))} />
                        <input className="border p-2 rounded w-full" placeholder="Longitude"
                            onChange={e => setDropoff(p => ({ ...p, lng: e.target.value }))} />
                    </div>
                </div>

                <button onClick={estimateFare}
                    className="border-2 border-black py-2 rounded-lg font-semibold">
                    Estimate Fare
                </button>

                {fare && (
                    <div className="bg-gray-50 border rounded-lg p-4 text-center">
                        <p className="text-gray-500 text-sm">{distance} km</p>
                        <p className="text-3xl font-bold">₹{fare}</p>
                        <button onClick={bookRide} disabled={loading}
                            className="mt-3 bg-black text-white px-8 py-2 rounded-lg w-full">
                            {loading ? 'Booking...' : 'Book Ride'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}