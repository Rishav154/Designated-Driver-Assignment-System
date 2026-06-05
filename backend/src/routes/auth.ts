import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.ts'
import { requireAuth } from '../middleware/requireAuth.ts'

const router = Router()

// Called once after signup to create user in your DB
router.post('/sync', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const { name, email, phone, role } = req.body

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required' })
    }

    try {
        // 1. Check if user already exists by clerkId
        const existingByClerkId = await prisma.user.findUnique({ where: { clerkId: userId! } })
        if (existingByClerkId) {
            // Keep the existing role, do NOT allow changes
            const updated = await prisma.user.update({
                where: { id: existingByClerkId.id },
                data: { name, phone } // Only allow updating name and phone
            })
            return res.json(updated)
        }

        // 2. Handle case where user exists with same email but different clerkId (e.g. email match from Clerk sync)
        const existingByEmail = await prisma.user.findUnique({ where: { email } })
        if (existingByEmail) {
            // Keep the existing role, update clerkId
            const updated = await prisma.user.update({
                where: { id: existingByEmail.id },
                data: { clerkId: userId!, name, phone } // Keep existingByEmail.role
            })
            return res.json(updated)
        }

        // 3. Create a new user since they don't exist yet
        const user = await prisma.user.create({
            data: { clerkId: userId!, name, email, phone, role }
        })
        res.json(user)
    } catch (err: any) {
        console.error('Sync error:', err)
        res.status(500).json({ error: err.message })
    }
})

// Save driver vehicle details
router.post('/driver-profile', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const { licenseNo, comfortableVehicles, age, gender } = req.body

    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const parsedAge = parseInt(age, 10)
    if (isNaN(parsedAge) || parsedAge <= 0) {
        return res.status(400).json({ error: 'Invalid age' })
    }

    const profile = await prisma.driverProfile.create({
        data: { 
            userId: user.id, 
            licenseNo, 
            comfortableVehicles, 
            age: parsedAge, 
            gender 
        }
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

// Update user profile (name, phone, profilePicture)
router.patch('/profile', requireAuth, async (req, res) => {
    const { userId } = getAuth(req)
    const { name, phone, profilePicture } = req.body

    if (name !== undefined && (!name || name.trim().length < 2)) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' })
    }

    if (phone !== undefined && phone && !/^\+?[\d\s\-().]{7,20}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' })
    }

    try {
        const updated = await prisma.user.update({
            where: { clerkId: userId! },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(phone !== undefined && { phone }),
                ...(profilePicture !== undefined && { profilePicture }),
            }
        })
        res.json(updated)
    } catch (err: any) {
        console.error('Profile update error:', err)
        res.status(500).json({ error: err.message })
    }
})

export default router