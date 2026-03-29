import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.ts'
import { requireAuth } from '../middleware/requireAuth.ts'

const router = Router()

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const BASE_FARE = 50
const RATE_PER_KM = 15

// POST /api/rides/estimate
router.post('/estimate', requireAuth, async (req, res) => {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body
    const distance = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng)
    const fare = BASE_FARE + distance * RATE_PER_KM
    res.json({ distance: distance.toFixed(2), fare: Math.round(fare) })
})

// POST /api/rides/book
router.post('/book', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const customer = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!customer) return res.status(404).json({ error: 'User not found' })

    const { pickupAddress, dropoffAddress,
        pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body

    const distance = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng)
    const fareEstimate = Math.round(BASE_FARE + distance * RATE_PER_KM)

    const ride = await prisma.ride.create({
        data: {
            customerId: customer.id,
            pickupAddress, dropoffAddress,
            pickupLat, pickupLng,
            dropoffLat, dropoffLng,
            fareEstimate
        }
    })
    res.json(ride)
})

// GET /api/rides/:id
router.get('/:id', requireAuth, async (req, res) => {
    const ride = await prisma.ride.findUnique({
        where: { id: req.params.id as string },
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            driver: {
                select: {
                    id: true,
                    name: true, phone: true,
                    driverProfile: { select: { vehicleMake: true, vehicleModel: true, vehiclePlate: true } }
                }
            }
        }
    })
    if (!ride) return res.status(404).json({ error: 'Ride not found' })
    res.json(ride)
})

// POST /api/rides/:id/accept  (driver accepts)
router.post('/:id/accept', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const driver = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })

    const ride = await prisma.ride.findUnique({ where: { id: req.params.id as string } })
    if (!ride) return res.status(404).json({ error: 'Ride not found' })
    if (ride.status !== 'SEARCHING') return res.status(409).json({ error: 'Ride no longer available' })

    const updated = await prisma.ride.update({
        where: { id: req.params.id as string },
        data: { driverId: driver.id, status: 'DRIVER_ASSIGNED' },
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            driver: { select: { id: true, name: true, phone: true } }
        }
    })

    // notify customer via socket
    req.app.get('io').to(`ride:${ride.id}`).emit('status:update', {
        status: 'DRIVER_ASSIGNED',
        driver: { name: driver.name, phone: driver.phone }
    })

    res.json(updated)
})

// POST /api/rides/:id/start
router.post('/:id/start', requireAuth, async (req, res) => {
    const ride = await prisma.ride.update({
        where: { id: req.params.id as string },
        data: { status: 'IN_PROGRESS' }
    })

    req.app.get('io').to(`ride:${ride.id}`).emit('status:update', { status: 'IN_PROGRESS' })
    res.json(ride)
})

// POST /api/rides/:id/complete
router.post('/:id/complete', requireAuth, async (req, res) => {
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id as string } })
    if (!ride) return res.status(404).json({ error: 'Ride not found' })

    const updated = await prisma.ride.update({
        where: { id: req.params.id as string },
        data: {
            status: 'COMPLETED',
            fareFinal: ride.fareEstimate,
            completedAt: new Date()
        }
    })

    req.app.get('io').to(`ride:${ride.id}`).emit('status:update', { status: 'COMPLETED' })
    res.json(updated)
})

// GET /api/rides  (get all rides for current user)
router.get('/', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const rides = await prisma.ride.findMany({
        where: user.role === 'DRIVER'
            ? { driverId: user.id }
            : { customerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            customer: { select: { id: true, name: true } },
            driver: { select: { id: true, name: true } }
        }
    })
    res.json(rides)
})

export default router