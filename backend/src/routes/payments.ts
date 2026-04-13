import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.ts'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const router = Router()

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
})

// Create order
router.post('/:rideId/create-order', async (req, res) => {
    try {
        const { userId } = getAuth(req)
        const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
        if (!user) return res.status(404).json({ error: 'User not found' })

        const ride = await prisma.ride.findUnique({
            where: { id: req.params.rideId }
        })
        if (!ride) return res.status(404).json({ error: 'Ride not found' })
        if (ride.status !== 'COMPLETED') return res.status(400).json({ error: 'Ride not completed yet' })

        const existing = await prisma.payment.findUnique({
            where: { rideId: ride.id }
        })
        if (existing) return res.status(409).json({ error: 'Already paid' })

        const amount = ride.fareFinal ?? ride.fareEstimate
        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit
            currency: "INR",
            receipt: ride.id,
        }

        const order = await razorpay.orders.create(options)
        res.json(order)
    } catch (error: any) {
        console.error('Create order error:', error)
        res.status(500).json({ error: error.message || 'Failed to create order' })
    }
})

// Pay for a completed ride
router.post('/:rideId/pay', async (req, res) => {
    try {
        const { userId } = getAuth(req)
        const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
        if (!user) return res.status(404).json({ error: 'User not found' })

        const ride = await prisma.ride.findUnique({
            where: { id: req.params.rideId }
        })
        if (!ride) return res.status(404).json({ error: 'Ride not found' })
        if (ride.status !== 'COMPLETED') return res.status(400).json({ error: 'Ride not completed yet' })
        if (ride.customerId !== user.id) return res.status(403).json({ error: 'Forbidden: only the customer can pay' })

        const existing = await prisma.payment.findUnique({
            where: { rideId: ride.id }
        })
        if (existing) return res.status(409).json({ error: 'Already paid' })

        const { method, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body
        const paymentMethod = method === 'CASH' ? 'CASH' : 'ONLINE'

        if (paymentMethod === 'ONLINE') {
            const body = razorpay_order_id + "|" + razorpay_payment_id
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '')
                .update(body.toString())
                .digest("hex")
                
            const isAuthentic = expectedSignature === razorpay_signature
            if (!isAuthentic) {
                return res.status(400).json({ error: 'Invalid payment signature' })
            }
        }

        const payment = await prisma.payment.create({
            data: {
                rideId: ride.id,
                amount: ride.fareFinal ?? ride.fareEstimate,
                method: paymentMethod,
                paymentId: paymentMethod === 'ONLINE' ? razorpay_payment_id : null,
                status: 'PAID'
            }
        })
        res.json(payment)
    } catch (error: any) {
        console.error('Payment error:', error)
        res.status(500).json({ error: error.message || 'Payment failed' })
    }
})

// Get payment for a ride
router.get('/:rideId', async (req, res) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { rideId: req.params.rideId },
            include: { ride: true }
        })
        if (!payment) return res.status(404).json({ error: 'Payment not found' })
        res.json(payment)
    } catch (error: any) {
        console.error('Get payment error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router