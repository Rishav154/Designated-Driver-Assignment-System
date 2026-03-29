import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.ts'
import { requireAuth } from '../middleware/requireAuth.ts'

const router = Router()

// Toggle driver online/offline
router.post('/availability', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const { isAvailable } = req.body

    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const profile = await prisma.driverProfile.update({
        where: { userId: user.id },
        data: { isAvailable }
    })
    res.json(profile)
})

// Get all available drivers (for finding nearby drivers)
router.get('/available', requireAuth, async (req, res) => {
    const drivers = await prisma.driverProfile.findMany({
        where: { isAvailable: true },
        include: {
            user: { select: { id: true, name: true, phone: true } }
        }
    })
    res.json(drivers)
})

// Get all open rides (for driver dashboard — rides with SEARCHING status)
router.get('/open-rides', requireAuth, async (req, res) => {
    const rides = await prisma.ride.findMany({
        where: { status: 'SEARCHING' },
        orderBy: { createdAt: 'desc' },
        include: {
            customer: { select: { name: true, phone: true } }
        }
    })
    res.json(rides)
})

// Get driver's current active ride
router.get('/my-ride', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const ride = await prisma.ride.findFirst({
        where: {
            driverId: user.id,
            status: { in: ['DRIVER_ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
            customer: { select: { name: true, phone: true } }
        }
    })
    res.json(ride)
})

export default router