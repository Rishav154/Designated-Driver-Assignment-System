import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
const router = Router();
// Toggle driver online/offline
router.post('/availability', requireAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const { isAvailable } = req.body;
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const profile = await prisma.driverProfile.update({
        where: { userId: user.id },
        data: { isAvailable }
    });
    res.json(profile);
});
// Get all available drivers (for finding nearby drivers)
router.get('/available', requireAuth, async (req, res) => {
    const drivers = await prisma.driverProfile.findMany({
        where: { isAvailable: true },
        include: {
            user: { select: { id: true, name: true, phone: true } }
        }
    });
    res.json(drivers);
});
// Get all open rides (for driver dashboard — rides with SEARCHING status)
router.get('/open-rides', requireAuth, async (req, res) => {
    const rides = await prisma.ride.findMany({
        where: { status: 'SEARCHING' },
        orderBy: { createdAt: 'desc' },
        include: {
            customer: { select: { name: true, phone: true } }
        }
    });
    res.json(rides);
});
// Get driver's current active ride
router.get('/my-ride', requireAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const ride = await prisma.ride.findFirst({
        where: {
            driverId: user.id,
            status: { in: ['DRIVER_ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
            customer: { select: { name: true, phone: true } }
        }
    });
    res.json(ride);
});
// Get driver stats (income, rides, rating)
router.get('/stats', requireAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { driverProfile: true }
    });
    if (!user || user.role !== 'DRIVER') {
        return res.status(403).json({ error: 'Only drivers can access stats' });
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [allCompletedRides, todayCompletedRides] = await Promise.all([
        prisma.ride.findMany({
            where: { driverId: user.id, status: 'COMPLETED' },
            select: { fareFinal: true }
        }),
        prisma.ride.findMany({
            where: {
                driverId: user.id,
                status: 'COMPLETED',
                completedAt: { gte: startOfToday }
            },
            select: { fareFinal: true }
        })
    ]);
    const totalIncome = allCompletedRides.reduce((sum, r) => sum + (r.fareFinal || 0), 0);
    const todayIncome = todayCompletedRides.reduce((sum, r) => sum + (r.fareFinal || 0), 0);
    // Get daily stats for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        return d;
    }).reverse();
    const dailyStatsRaw = await prisma.ride.findMany({
        where: {
            driverId: user.id,
            status: 'COMPLETED',
            completedAt: { gte: last7Days[0] }
        },
        select: { fareFinal: true, completedAt: true }
    });
    const dailyStats = last7Days.map(date => {
        const dayRides = dailyStatsRaw.filter(r => {
            const rd = new Date(r.completedAt);
            return rd.getFullYear() === date.getFullYear() &&
                rd.getMonth() === date.getMonth() &&
                rd.getDate() === date.getDate();
        });
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            rides: dayRides.length,
            income: dayRides.reduce((sum, r) => sum + (r.fareFinal || 0), 0)
        };
    });
    // Get recent feedback
    const feedback = await prisma.rating.findMany({
        where: { rateeId: user.id },
        take: 5,
        orderBy: { ride: { completedAt: 'desc' } },
        include: {
            rater: { select: { name: true, profilePicture: true } }
        }
    });
    res.json({
        totalIncome,
        todayIncome,
        totalRides: allCompletedRides.length,
        todayRides: todayCompletedRides.length,
        dailyStats,
        rating: user.driverProfile?.rating || 5.0,
        feedback: feedback.map(f => ({
            id: f.id,
            score: f.score,
            comment: f.comment,
            customerName: f.rater.name,
            customerAvatar: f.rater.profilePicture
        }))
    });
});
export default router;
