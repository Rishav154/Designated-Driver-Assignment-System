import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.js";
import rideRoutes from "./routes/rides.js";
import driverRoutes from "./routes/drivers.js";
import paymentRoutes from "./routes/payments.js";
import mapsRoutes from "./routes/maps.js";
import { clerkMiddleware } from '@clerk/express';
import ratingsRoutes from "./routes/ratings.js";
import locationsRoutes from "./routes/locations.js";
import notificationsRoutes from "./routes/notifications.js";
import { requireAuth } from "./middleware/requireAuth.js";
dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const origin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
const io = new Server(httpServer, {
    cors: { origin }
});
app.use(cors({ origin }));
app.use(express.json({ limit: '10mb' })); // larger limit for base64 profile pictures
app.use(clerkMiddleware());
// make io accessible in routes
app.set('io', io);
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', requireAuth, rideRoutes);
app.use('/api/drivers', requireAuth, driverRoutes);
app.use('/api/payments', requireAuth, paymentRoutes);
app.use('/api/ratings', requireAuth, ratingsRoutes);
app.use('/api/maps', requireAuth, mapsRoutes);
app.use('/api/locations', requireAuth, locationsRoutes);
app.use('/api/notifications', requireAuth, notificationsRoutes);
// Socket.io events
io.on('connection', (socket) => {
    socket.on('join:ride', (rideId) => socket.join(`ride:${rideId}`));
    socket.on('driver:location', ({ rideId, lat, lng }) => {
        io.to(`ride:${rideId}`).emit('location:update', { lat, lng });
    });
    socket.on('ride:status', ({ rideId, status }) => {
        io.to(`ride:${rideId}`).emit('status:update', { status });
    });
});
app.get('/health', (_, res) => res.json({ ok: true }));
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Backend running on :${PORT}`));
