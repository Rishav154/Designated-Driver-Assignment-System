import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.ts'

const router = Router()

// GET /api/locations
router.get('/', async (req, res) => {
    const { userId } = getAuth(req)
    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const locations = await prisma.savedLocation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' }
    })
    res.json(locations)
})

// POST /api/locations
router.post('/', async (req, res) => {
    const { userId } = getAuth(req)
    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { label, address, lat, lng } = req.body

    if (!label || !address || lat == null || lng == null) {
        return res.status(400).json({ error: 'label, address, lat and lng are required' })
    }

    const location = await prisma.savedLocation.create({
        data: { userId: user.id, label, address, lat: parseFloat(lat), lng: parseFloat(lng) }
    })
    res.status(201).json(location)
})

// PATCH /api/locations/:id
router.patch('/:id', async (req, res) => {
    const { userId } = getAuth(req)
    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const existing = await prisma.savedLocation.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Location not found' })
    if (existing.userId !== user.id) return res.status(403).json({ error: 'Forbidden' })

    const { label, address, lat, lng } = req.body
    const updated = await prisma.savedLocation.update({
        where: { id: req.params.id },
        data: {
            ...(label !== undefined && { label }),
            ...(address !== undefined && { address }),
            ...(lat !== undefined && { lat: parseFloat(lat) }),
            ...(lng !== undefined && { lng: parseFloat(lng) }),
        }
    })
    res.json(updated)
})

// DELETE /api/locations/:id
router.delete('/:id', async (req, res) => {
    const { userId } = getAuth(req)
    const user = await prisma.user.findUnique({ where: { clerkId: userId! } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const existing = await prisma.savedLocation.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Location not found' })
    if (existing.userId !== user.id) return res.status(403).json({ error: 'Forbidden' })

    await prisma.savedLocation.delete({ where: { id: req.params.id } })
    res.json({ success: true })
})

export default router
