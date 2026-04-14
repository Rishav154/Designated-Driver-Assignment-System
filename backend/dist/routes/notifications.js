import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from "../lib/prisma.js";
const router = Router();
// GET /api/notifications  — last 30, newest first
router.get('/', async (req, res) => {
    const { userId } = getAuth(req);
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30
    });
    res.json(notifications);
});
// PATCH /api/notifications/:id/read  — mark single as read
router.patch('/:id/read', async (req, res) => {
    const { userId } = getAuth(req);
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif)
        return res.status(404).json({ error: 'Notification not found' });
    if (notif.userId !== user.id)
        return res.status(403).json({ error: 'Forbidden' });
    const updated = await prisma.notification.update({
        where: { id: req.params.id },
        data: { read: true }
    });
    res.json(updated);
});
// PATCH /api/notifications/read-all  — mark all as read
router.patch('/read-all', async (req, res) => {
    const { userId } = getAuth(req);
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true }
    });
    res.json({ success: true });
});
export default router;
