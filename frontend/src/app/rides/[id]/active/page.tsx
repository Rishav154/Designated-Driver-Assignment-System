'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { io } from 'socket.io-client'
import { getApi } from '@/lib/api'

export default function ActiveRide() {
    const { id } = useParams()
    const { getToken } = useAuth()
    const router = useRouter()
    const [ride, setRide] = useState<any>(null)
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)

    useEffect(() => {
        getApi(getToken).then(api =>
            api.get(`/api/rides/${id}`).then(res => setRide(res.data))
        )

        const socket = io(process.env.NEXT_PUBLIC_API_URL!)
        socket.emit('join:ride', id)

        socket.on('location:update', ({ lat, lng }) => setLocation({ lat, lng }))
        socket.on('status:update', ({ status }) => {
            if (status === 'COMPLETED') router.push(`/rides/${id}/complete`)
        })

        return () => { socket.disconnect() }
    }, [id])

    return (
        <div className="min-h-screen p-8 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6">Ride in Progress</h1>

            {ride && (
                <div className="flex flex-col gap-4">
                    <div className="border rounded-lg p-4">
                        <p className="text-gray-500 text-sm">Driver</p>
                        <p className="font-semibold text-lg">{ride.driver?.name}</p>
                        <p className="text-gray-600">{ride.driver?.phone}</p>
                        <p className="text-gray-600 text-sm mt-1">
                            {ride.driver?.driverProfile?.vehicleMake} {ride.driver?.driverProfile?.vehicleModel}
                            · {ride.driver?.driverProfile?.vehiclePlate}
                        </p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <p className="text-gray-500 text-sm">From</p>
                        <p className="font-semibold">{ride.pickupAddress}</p>
                        <p className="text-gray-500 text-sm mt-2">To</p>
                        <p className="font-semibold">{ride.dropoffAddress}</p>
                    </div>

                    {location && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <p className="text-gray-500 text-sm">Driver location (live)</p>
                            <p className="font-mono text-sm">
                                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                            </p>
                        </div>
                    )}

                    <div className="border rounded-lg p-4 text-center">
                        <p className="text-gray-500 text-sm">Estimated fare</p>
                        <p className="text-3xl font-bold">₹{ride.fareEstimate}</p>
                    </div>
                </div>
            )}
        </div>
    )
}