'use client'
import { useUser, useAuth } from '@clerk/nextjs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()
    const [role, setRole] = useState<'CUSTOMER' | 'DRIVER'>('CUSTOMER')
    const [vehicle, setVehicle] = useState({
        licenseNo: '', vehicleMake: '', vehicleModel: '', vehiclePlate: ''
    })
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit() {
        setIsLoading(true)
        try {
            const token = await getToken()

            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: user?.fullName,
                    email: user?.primaryEmailAddress?.emailAddress,
                    phone: user?.primaryPhoneNumber?.phoneNumber,
                    role
                })
            })

            if (role === 'DRIVER') {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/driver-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(vehicle)
                })
            }

            router.push('/dashboard')
        } catch (error) {
            console.error('Error in onboarding:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Left side: branding/illustration */}
            <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-gray-900 to-indigo-900 p-16 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 blur-[1px]"></div>
                <div className="relative z-10 w-full">
                    <h1 className="text-5xl font-extrabold text-white tracking-tight mb-6 mt-16">SafeRide.</h1>
                    <p className="text-gray-300 text-lg leading-relaxed max-w-md">
                        Your reliable designated driver system. Travel safely in the comfort of your own vehicle.
                    </p>
                </div>
                <div className="relative z-10 mb-8">
                    <div className="w-16 h-1 bg-indigo-500 rounded-full mb-6"></div>
                    <p className="text-indigo-200 font-semibold tracking-widest text-xs opacity-90 uppercase">Step 1 of 1 &middot; Account Setup</p>
                </div>
            </div>

            {/* Right side: form */}
            <div className="flex-1 px-8 py-12 md:py-24 flex flex-col justify-center items-center bg-white shadow-[-20px_0_30px_-15px_rgba(0,0,0,0.05)] z-10 relative">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">Welcome aboard!</h2>
                        <p className="text-gray-500 text-lg">How do you plan to use SafeRide?</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-5 mb-10">
                        <button
                            onClick={() => setRole('CUSTOMER')}
                            className={`flex-1 relative flex flex-col items-center p-6 border-2 rounded-2xl transition-all duration-300 hover:shadow-lg ${role === 'CUSTOMER' ? 'border-indigo-600 bg-indigo-50/50 scale-[1.02] shadow-md ring-4 ring-indigo-50' : 'border-gray-200 hover:border-indigo-200 bg-white'}`}
                        >
                            <div className={`w-14 h-14 rounded-full mb-4 flex items-center justify-center transition-colors ${role === 'CUSTOMER' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            </div>
                            <span className={`font-bold text-lg mb-1 ${role === 'CUSTOMER' ? 'text-indigo-950' : 'text-gray-600'}`}>Passenger</span>
                            <span className="text-xs font-medium text-gray-400">Book drivers for your car</span>
                            {role === 'CUSTOMER' && <div className="absolute -top-3 -right-3 bg-indigo-600 text-white rounded-full p-1.5 shadow-sm border-2 border-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></div>}
                        </button>

                        <button
                            onClick={() => setRole('DRIVER')}
                            className={`flex-1 relative flex flex-col items-center p-6 border-2 rounded-2xl transition-all duration-300 hover:shadow-lg ${role === 'DRIVER' ? 'border-gray-900 bg-gray-50 scale-[1.02] shadow-md ring-4 ring-gray-100' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                        >
                            <div className={`w-14 h-14 rounded-full mb-4 flex items-center justify-center transition-colors ${role === 'DRIVER' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <span className={`font-bold text-lg mb-1 ${role === 'DRIVER' ? 'text-gray-900' : 'text-gray-600'}`}>Driver</span>
                            <span className="text-xs font-medium text-gray-400">Earn by driving others</span>
                            {role === 'DRIVER' && <div className="absolute -top-3 -right-3 bg-gray-900 text-white rounded-full p-1.5 shadow-sm border-2 border-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></div>}
                        </button>
                    </div>

                    <div className="transition-all duration-500 overflow-hidden" style={{ maxHeight: role === 'DRIVER' ? '600px' : '0px', opacity: role === 'DRIVER' ? 1 : 0 }}>
                        <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 mb-8 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Vehicle Verification Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1 uppercase tracking-wide">Driver License Number</label>
                                    <input placeholder="e.g. DL-1234567" className="w-full bg-gray-50/50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all placeholder-gray-300 text-gray-900 font-medium"
                                        value={vehicle.licenseNo} onChange={e => setVehicle(v => ({ ...v, licenseNo: e.target.value }))} required={role === 'DRIVER'} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1 uppercase tracking-wide">Vehicle Make</label>
                                        <input placeholder="e.g. Toyota" className="w-full bg-gray-50/50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all placeholder-gray-300 text-gray-900 font-medium"
                                            value={vehicle.vehicleMake} onChange={e => setVehicle(v => ({ ...v, vehicleMake: e.target.value }))} required={role === 'DRIVER'} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1 uppercase tracking-wide">Vehicle Model</label>
                                        <input placeholder="e.g. Camry" className="w-full bg-gray-50/50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all placeholder-gray-300 text-gray-900 font-medium"
                                            value={vehicle.vehicleModel} onChange={e => setVehicle(v => ({ ...v, vehicleModel: e.target.value }))} required={role === 'DRIVER'} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1 uppercase tracking-wide">License Plate</label>
                                    <input placeholder="e.g. ABC 1234" className="w-full bg-gray-50/50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all placeholder-gray-300 text-gray-900 font-medium uppercase"
                                        value={vehicle.vehiclePlate} onChange={e => setVehicle(v => ({ ...v, vehiclePlate: e.target.value.toUpperCase() }))} required={role === 'DRIVER'} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || (role === 'DRIVER' && (!vehicle.licenseNo || !vehicle.vehicleMake || !vehicle.vehicleModel || !vehicle.vehiclePlate))}
                        className={`w-full text-white font-bold text-lg px-8 py-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 ${role === 'DRIVER' ? 'bg-gray-900 hover:bg-black' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'}`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Setting up...
                            </>
                        ) : 'Complete Profile'}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-6 font-medium">By continuing, you agree to our Terms of Service & Privacy Policy.</p>
                </div>
            </div>
        </div>
    )
}