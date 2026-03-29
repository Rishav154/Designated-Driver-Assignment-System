'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { io } from 'socket.io-client'
import { getApi } from '@/lib/api'

export default function Waiting() {
    const { id } = useParams()
    const { getToken } = useAuth()
    const router = useRouter()
    const [driver, setDriver] = useState<any>(null)

    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_API_URL!)
        socket.emit('join:ride', id)

        socket.on('status:update', ({ status, driver }) => {
            if (status === 'DRIVER_ASSIGNED') {
                setDriver(driver)
                setTimeout(() => router.push(`/rides/${id}/active`), 2000)
            }
        })

        return () => { socket.disconnect() }
    }, [id])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
            {!driver ? (
                <>
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin" />
                    <h1 className="text-2xl font-bold">Finding your driver...</h1>
                    <p className="text-gray-500">Please wait while we find a nearby driver</p>
                </>
            ) : (
                <>
                    <div className="text-5xl">✓</div>
                    <h1 className="text-2xl font-bold">Driver Found!</h1>
                    <p className="text-gray-700">{driver.name} is on the way</p>
                    <p className="text-gray-500">{driver.phone}</p>
                </>
            )}
        </div>
    )
}