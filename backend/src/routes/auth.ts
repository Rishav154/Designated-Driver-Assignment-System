import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.ts'
import { requireAuth } from '../middleware/requireAuth.ts'

const router = Router()

// Called once after signup to create user in your DB
router.post('/sync', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const { name, email, phone, role } = req.body

    const user = await prisma.user.upsert({
        where: { clerkId: userId! },
        update: {},
        create: { clerkId: userId!, name, email, phone, role }
    })
    res.json(user)
})

// Save driver vehicle details
router.post('/driver-profile', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const { licenseNo, vehicleMake, vehicleModel, vehiclePlate } = req.body

    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const profile = await prisma.driverProfile.create({
        data: { userId: user.id, licenseNo, vehicleMake, vehicleModel, vehiclePlate }
    })
    res.json(profile)
})

// Get current user from your DB
router.get('/me', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const user = await prisma.user.findUnique({
        where: { clerkId: userId! },
        include: { driverProfile: true }
    })
    res.json(user)
})

export default router