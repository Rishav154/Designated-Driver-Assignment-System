import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.ts'
import rideRoutes from './routes/rides.ts'
import driverRoutes from './routes/drivers.ts'
import paymentRoutes from './routes/payments.ts'
import { clerkMiddleware } from '@clerk/express'
import ratingsRoutes from './routes/ratings.ts'
import { requireAuth } from './middleware/requireAuth.ts'
dotenv.config()

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    cors: { origin: 'http://localhost:3000' }
})

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())
app.use(clerkMiddleware())

// make io accessible in routes
app.set('io', io)

// Routes (we'll fill these in next phases)
app.use('/api/auth', authRoutes)
app.use('/api/rides', requireAuth, rideRoutes)
app.use('/api/drivers', requireAuth, driverRoutes)
app.use('/api/payments', requireAuth, paymentRoutes)
app.use('/api/ratings', requireAuth, ratingsRoutes)


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