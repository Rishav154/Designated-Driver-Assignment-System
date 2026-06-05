import { Server } from 'socket.io'
import { prisma } from '../lib/prisma.ts'

export function startAutoCancelJob(io: Server) {
    setInterval(async () => {
        try {
            const thresholdTime = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
            
            // Find rides that are still SEARCHING and created more than 5 minutes ago
            const ridesToCancel = await prisma.ride.findMany({
                where: {
                    status: 'SEARCHING',
                    createdAt: {
                        lt: thresholdTime
                    }
                }
            })

            for (const ride of ridesToCancel) {
                // Update ride status to CANCELLED
                await prisma.ride.update({
                    where: { id: ride.id },
                    data: { status: 'CANCELLED' }
                })

                // Create in-app notification for the customer
                await prisma.notification.create({
                    data: {
                        userId: ride.customerId,
                        type: 'TRIP_CANCELLED',
                        message: 'Your ride was cancelled automatically as no driver accepted it within 5 minutes.',
                        rideId: ride.id
                    }
                })

                // Notify customer via socket room
                io.to(`ride:${ride.id}`).emit('status:update', {
                    status: 'CANCELLED'
                })
                
                console.log(`Automatically cancelled ride ${ride.id} due to acceptance timeout.`)
            }
        } catch (error) {
            console.error('Error running auto-cancel job:', error)
        }
    }, 15000) // run every 15 seconds to ensure quick response
}
