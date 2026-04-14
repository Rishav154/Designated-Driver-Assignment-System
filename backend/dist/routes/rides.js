import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { osrmDistance } from "../utils/osrmDistance.js";
const router = Router();
// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function calculateFare(distanceKm) {
    const BASE_KM = 3;
    const BASE_PRICE = 69;
    const PER_KM_AFTER_BASE = 13;
    const NIGHT_SURGE = 40;
    let fare = BASE_PRICE;
    if (distanceKm > BASE_KM) {
        fare += (distanceKm - BASE_KM) * PER_KM_AFTER_BASE;
    }
    // Night surge: 11 PM to 6 AM
    // Using IST (assuming server time or UTC+5:30)
    // To be safe, we'll use current hour from the environment
    const now = new Date();
    const currentHour = now.getHours(); // Local time of the environment
    if (currentHour >= 23 || currentHour < 6) {
        fare += NIGHT_SURGE;
    }
    return Math.round(fare);
}
// POST /api/rides/estimate
router.post('/estimate', requireAuth, async (req, res) => {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;
    try {
        const { distanceKm, durationSeconds } = await osrmDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
        const fare = calculateFare(distanceKm);
        res.json({ distance: distanceKm.toFixed(2), fare, durationSeconds });
    }
    catch (error) {
        // Fallback to Haversine
        const distance = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
        const fare = calculateFare(distance);
        res.json({ distance: distance.toFixed(2), fare, fallback: true });
    }
});
// POST /api/rides/book
router.post('/book', requireAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const customer = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!customer)
        return res.status(404).json({ error: 'User not found' });
    const { pickupAddress, dropoffAddress, pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;
    let distance = 0;
    let durationSeconds = null;
    try {
        const osrmRes = await osrmDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
        distance = osrmRes.distanceKm;
        durationSeconds = osrmRes.durationSeconds;
    }
    catch (error) {
        distance = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    }
    const fareEstimate = calculateFare(distance);
    const rideData = {
        customerId: customer.id,
        pickupAddress, dropoffAddress,
        pickupLat, pickupLng,
        dropoffLat, dropoffLng,
        fareEstimate
    };
    if (durationSeconds !== null) {
        rideData.durationSeconds = durationSeconds;
    }
    const ride = await prisma.ride.create({
        data: rideData
    });
    res.json(ride);
});
// GET /api/rides/history  — paginated trip history with full details
router.get('/history', requireAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [rides, total] = await Promise.all([
        prisma.ride.findMany({
            where: user.role === 'DRIVER'
                ? { driverId: user.id }
                : { customerId: user.id },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                customer: { select: { id: true, name: true, phone: true, profilePicture: true } },
                driver: {
                    select: {
                        id: true, name: true, phone: true, profilePicture: true,
                        driverProfile: { select: { vehicleMake: true, vehicleModel: true, vehiclePlate: true, rating: true } }
                    }
                },
                payment: true,
                ratings: true
            }
        }),
        prisma.ride.count({
            where: user.role === 'DRIVER'
                ? { driverId: user.id }
                : { customerId: user.id }
        })
    ]);
    res.json({ rides, total, page, limit, pages: Math.ceil(total / limit) });
});
// GET /api/rides/:id
router.get('/:id', requireAuth, async (req, res) => {
    const ride = await prisma.ride.findUnique({
        where: { id: req.params.id },
        include: {
            customer: { select: { id: true, name: true, phone: true, profilePicture: true } },
            driver: {
                select: {
                    id: true,
                    name: true, phone: true, profilePicture: true,
                    driverProfile: { select: { vehicleMake: true, vehicleModel: true, vehiclePlate: true, rating: true } }
                }
            },
            payment: true,
            ratings: true
        }
    });
    if (!ride)
        return res.status(404).json({ error: 'Ride not found' });
    res.json(ride);
});
// POST /api/rides/:id/accept  (driver accepts)
router.post('/:id/accept', requireAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const driver = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!driver)
        return res.status(404).json({ error: 'Driver not found' });
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride)
        return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'SEARCHING')
        return res.status(409).json({ error: 'Ride no longer available' });
    const updated = await prisma.ride.update({
        where: { id: req.params.id },
        data: { driverId: driver.id, status: 'DRIVER_ASSIGNED' },
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            driver: { select: { id: true, name: true, phone: true } }
        }
    });
    // create in-app notification for customer
    await prisma.notification.create({
        data: {
            userId: ride.customerId,
            type: 'DRIVER_ASSIGNED',
            message: `Your driver ${driver.name} has been assigned and is on the way!`,
            rideId: ride.id
        }
    });
    // notify customer via socket
    req.app.get('io').to(`ride:${ride.id}`).emit('status:update', {
        status: 'DRIVER_ASSIGNED',
        driver: { name: driver.name, phone: driver.phone }
    });
    res.json(updated);
});
// POST /api/rides/:id/start
router.post('/:id/start', requireAuth, async (req, res) => {
    const ride = await prisma.ride.update({
        where: { id: req.params.id },
        data: { status: 'IN_PROGRESS' }
    });
    // create in-app notification for customer
    await prisma.notification.create({
        data: {
            userId: ride.customerId,
            type: 'TRIP_STARTED',
            message: 'Your trip has started. Sit back and enjoy the ride!',
            rideId: ride.id
        }
    });
    req.app.get('io').to(`ride:${ride.id}`).emit('status:update', { status: 'IN_PROGRESS' });
    res.json(ride);
});
// POST /api/rides/:id/complete
router.post('/:id/complete', requireAuth, async (req, res) => {
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride)
        return res.status(404).json({ error: 'Ride not found' });
    const updated = await prisma.ride.update({
        where: { id: req.params.id },
        data: {
            status: 'COMPLETED',
            fareFinal: ride.fareEstimate,
            completedAt: new Date()
        }
    });
    // create in-app notification for customer
    await prisma.notification.create({
        data: {
            userId: ride.customerId,
            type: 'TRIP_COMPLETED',
            message: `Trip completed! Your fare was ₹${ride.fareEstimate}. Thank you for riding with SafeRide.`,
            rideId: ride.id
        }
    });
    req.app.get('io').to(`ride:${ride.id}`).emit('status:update', { status: 'COMPLETED' });
    res.json(updated);
});
// GET /api/rides  (get all rides for current user)
router.get('/', requireAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const rides = await prisma.ride.findMany({
        where: user.role === 'DRIVER'
            ? { driverId: user.id }
            : { customerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            customer: { select: { id: true, name: true } },
            driver: { select: { id: true, name: true } }
        }
    });
    res.json(rides);
});
export default router;
