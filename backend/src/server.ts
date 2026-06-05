import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.ts'
import rideRoutes from './routes/rides.ts'
import driverRoutes from './routes/drivers.ts'
import paymentRoutes from './routes/payments.ts'
import mapsRoutes from './routes/maps.ts'
import { clerkMiddleware } from '@clerk/express'
import ratingsRoutes from './routes/ratings.ts'
import locationsRoutes from './routes/locations.ts'
import notificationsRoutes from './routes/notifications.ts'
import { requireAuth } from './middleware/requireAuth.ts'
import { startAutoCancelJob } from './utils/autoCancelRides.ts'
dotenv.config()

const app = express()
const httpServer = http.createServer(app)
const origin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000'
const io = new Server(httpServer, {
    cors: { origin }
})

startAutoCancelJob(io)

app.use(cors({ origin }))
app.use(express.json({ limit: '10mb' })) // larger limit for base64 profile pictures
app.use(clerkMiddleware())

// make io accessible in routes
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/rides', requireAuth, rideRoutes)
app.use('/api/drivers', requireAuth, driverRoutes)
app.use('/api/payments', requireAuth, paymentRoutes)
app.use('/api/ratings', requireAuth, ratingsRoutes)
app.use('/api/maps', requireAuth, mapsRoutes)
app.use('/api/locations', requireAuth, locationsRoutes)
app.use('/api/notifications', requireAuth, notificationsRoutes)


// Socket.io events
io.on('connection', (socket) => {
    socket.on('join:ride', (rideId) => socket.join(`ride:${rideId}`))

    socket.on('driver:location', ({ rideId, lat, lng }) => {
        io.to(`ride:${rideId}`).emit('location:update', { lat, lng })
    })

    socket.on('ride:status', ({ rideId, status }) => {
        io.to(`ride:${rideId}`).emit('status:update', { status })
    })
})

app.get('/health', (_, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => console.log(`Backend running on :${PORT}`))