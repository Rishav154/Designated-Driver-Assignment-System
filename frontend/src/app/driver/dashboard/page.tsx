'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApi } from '@/lib/api'

export default function DriverDashboard() {
    const { getToken } = useAuth()
    const router = useRouter()
    const [available, setAvailable] = useState(false)
    const [rides, setRides] = useState<any[]>([])

    async function toggleAvailability() {
        const api = await getApi(getToken)
        await api.post('/api/drivers/availability', { isAvailable: !available })
        setAvailable(a => !a)
        if (!available) fetchOpenRides()
    }

    async function fetchOpenRides() {
        const api = await getApi(getToken)
        const res = await api.get('/api/drivers/open-rides')
        setRides(res.data)
    }

    useEffect(() => {
        fetchOpenRides()
        const interval = setInterval(fetchOpenRides, 10000) // poll every 10s
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="min-h-screen p-8 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6">Driver Dashboard</h1>

            <div className="flex items-center justify-between border rounded-lg p-4 mb-6">
                <div>
                    <p className="font-semibold">Status</p>
                    <p className={available ? 'text-green-600' : 'text-gray-400'}>
                        {available ? 'Online — accepting rides' : 'Offline'}
                    </p>
                </div>
                <button onClick={toggleAvailability}
                    className={`px-4 py-2 rounded-lg font-semibold ${available ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {available ? 'Go Offline' : 'Go Online'}
                </button>
            </div>

            <h2 className="font-semibold mb-3">Open Ride Requests</h2>
            {rides.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No open rides right now</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {rides.map(ride => (
                        <div key={ride.id} className="border rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{ride.pickupAddress}</p>
                                <p className="text-gray-500 text-sm">→ {ride.dropoffAddress}</p>
                                <p className="text-gray-500 text-sm">{ride.customer.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">₹{ride.fareEstimate}</p>
                                <button
                                    onClick={() => router.push(`/driver/rides/${ride.id}`)}
                                    className="mt-2 bg-black text-white px-3 py-1 rounded text-sm">
                                    View
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}