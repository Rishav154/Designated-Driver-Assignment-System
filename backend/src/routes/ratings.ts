import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.ts'
import { requireAuth } from '../middleware/requireAuth.ts'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { userId } = getAuth(req)
  const rater = await prisma.user.findUnique({ where: { clerkId: userId! } })
  if (!rater) return res.status(404).json({ error: 'User not found' })

  const { rideId, rateeId, score, comment } = req.body
  console.log('Rating request:', { rideId, rateeId, score, comment })

  if (!rideId || !rateeId || score === undefined) {
    return res.status(400).json({ error: 'rideId, rateeId, and score are required' })
  }

  try {
    const rating = await prisma.rating.create({
      data: { rideId, raterId: rater.id, rateeId, score: Number(score), comment }
    })

    // recalculate driver average rating
    const avg = await prisma.rating.aggregate({
      where: { rateeId },
      _avg: { score: true }
    })
    await prisma.driverProfile.updateMany({
      where: { userId: rateeId },
      data: { rating: avg._avg.score ?? 5.0 }
    })

    res.json(rating)
  } catch (error: any) {
    console.error('Rating error:', error)
    res.status(500).json({ error: error.message || 'Failed to create rating' })
  }
})

export default router