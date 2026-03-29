'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { getApi } from '@/lib/api'

export default function DriverRide() {
    const { id } = useParams()
    const { getToken } = useAuth()
    const router = useRouter()
    const [ride, setRide] = useState<any>(null)

    useEffect(() => {
        getApi(getToken).then(api =>
            api.get(`/api/rides/${id}`).then(res => setRide(res.data))
        )
    }, [id])

    // send live location
    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_API_URL!)
        socket.emit('join:ride', id)

        const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(({ coords }) => {
                socket.emit('driver:location', {
                    rideId: id,
                    lat: coords.latitude,
                    lng: coords.longitude
                })
            })
        }, 5000)

        return () => { clearInterval(interval); socket.disconnect() }
    }, [id])

    async function acceptRide() {
        const api = await getApi(getToken)
        await api.post(`/api/rides/${id}/accept`)
        setRide((r: any) => ({ ...r, status: 'DRIVER_ASSIGNED' }))
    }

    async function startRide() {
        const api = await getApi(getToken)
        await api.post(`/api/rides/${id}/start`)
        setRide((r: any) => ({ ...r, status: 'IN_PROGRESS' }))
    }

    async function completeRide() {
        const api = await getApi(getToken)
        await api.post(`/api/rides/${id}/complete`)
        router.push('/driver/dashboard')
    }

    return (
        <div className="min-h-screen p-8 max-w-lg mx-auto flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Ride Details</h1>

            {ride && (
                <>
                    <div className="border rounded-lg p-4">
                        <p className="text-gray-500 text-sm">Customer</p>
                        <p className="font-semibold">{ride.customer?.name}</p>
                        <p className="text-gray-600">{ride.customer?.phone}</p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <p className="text-gray-500 text-sm">From</p>
                        <p className="font-semibold">{ride.pickupAddress}</p>
                        <p className="text-gray-500 text-sm mt-2">To</p>
                        <p className="font-semibold">{ride.dropoffAddress}</p>
                    </div>

                    <div className="border rounded-lg p-4 text-center">
                        <p className="text-gray-500 text-sm">Fare</p>
                        <p className="text-3xl font-bold">₹{ride.fareEstimate}</p>
                    </div>

                    <div className="border rounded-lg p-3 text-center bg-gray-50">
                        <p className="text-sm text-gray-500">Status: <span className="font-semibold text-black">{ride.status}</span></p>
                    </div>

                    {ride.status === 'SEARCHING' && (
                        <button onClick={acceptRide}
                            className="bg-green-600 text-white py-3 rounded-lg font-semibold">
                            Accept Ride
                        </button>
                    )}
                    {ride.status === 'DRIVER_ASSIGNED' && (
                        <button onClick={startRide}
                            className="bg-blue-600 text-white py-3 rounded-lg font-semibold">
                            Start Ride
                        </button>
                    )}
                    {ride.status === 'IN_PROGRESS' && (
                        <button onClick={completeRide}
                            className="bg-black text-white py-3 rounded-lg font-semibold">
                            Complete Ride
                        </button>
                    )}
                </>
            )}
        </div>
    )
}