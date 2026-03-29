'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getApi } from '@/lib/api'

export default function Complete() {
    const { id } = useParams()
    const { getToken } = useAuth()
    const router = useRouter()
    const [ride, setRide] = useState<any>(null)
    const [rating, setRating] = useState(5)
    const [paid, setPaid] = useState(false)
    const [rated, setRated] = useState(false)

    useEffect(() => {
        getApi(getToken).then(api =>
            api.get(`/api/rides/${id}`).then(res => setRide(res.data))
        )
    }, [id])

    async function handlePay() {
        const api = await getApi(getToken)
        await api.post(`/api/payments/${id}/pay`)
        setPaid(true)
    }

    async function handleRate() {
        const api = await getApi(getToken)
        await api.post('/api/ratings', {
            rideId: id,
            rateeId: ride?.driver?.id,
            score: rating,
            comment: ''
        })
        setRated(true)
        setTimeout(() => router.push('/dashboard'), 1500)
    }

    return (
        <div className="min-h-screen p-8 max-w-lg mx-auto flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Ride Complete!</h1>

            {ride && (
                <div className="border rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-sm">Total fare</p>
                    <p className="text-4xl font-bold">₹{ride.fareFinal ?? ride.fareEstimate}</p>
                </div>
            )}

            {!paid ? (
                <button onClick={handlePay}
                    className="bg-black text-white py-3 rounded-lg font-semibold">
                    Pay Now
                </button>
            ) : !rated ? (
                <div className="border rounded-lg p-4 flex flex-col gap-4">
                    <h2 className="font-semibold">Rate your driver</h2>
                    <div className="flex gap-2 justify-center">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setRating(s)}
                                className={`text-3xl ${rating >= s ? 'opacity-100' : 'opacity-30'}`}>
                                ★
                            </button>
                        ))}
                    </div>
                    <button onClick={handleRate}
                        className="bg-black text-white py-2 rounded-lg">
                        Submit Rating
                    </button>
                </div>
            ) : (
                <p className="text-center text-green-600 font-semibold">Thanks! Redirecting...</p>
            )}
        </div>
    )
}