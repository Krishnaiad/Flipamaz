const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

const app = express();
const port = process.env.PORT || 4006;
const prisma = new PrismaClient();

// Setup middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Helper to decode user session from cookie
const getSessionUser = (req) => {
  const sessionCookie = req.cookies['flipamaz_session'];
  if (!sessionCookie) return null;
  try {
    const raw = Buffer.from(sessionCookie, 'base64').toString('utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

// API: Get Notifications for active user
app.get('/api/notifications', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.json({ notifications: [] });

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: 'desc' },
      take: 10 // Last 10 alerts
    });
    return res.json({ notifications });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Mark all notifications as read
app.put('/api/notifications/read-all', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await prisma.notification.updateMany({
      where: { userId: sessionUser.id, isRead: false },
      data: { isRead: true }
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Read notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize Background Redis Event Consumer
const initRedisSubscriber = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
  const subClient = createClient({ url: redisUrl });
  
  subClient.on('error', (err) => console.error('Redis subscriber error:', err));
  
  try {
    await subClient.connect();
    console.log('Notification Service connected to Redis Event Bus.');

    // Subscribe to Event Channels
    await subClient.subscribe(['USER_CREATED', 'ORDER_PLACED', 'ORDER_STATUS_CHANGED'], async (message, channel) => {
      console.log(`Received event on channel ${channel}:`, message);
      try {
        const payload = JSON.parse(message);
        let alertMessage = '';
        let type = 'INFO';
        let targetUserId = null;

        if (channel === 'USER_CREATED') {
          targetUserId = payload.userId;
          alertMessage = `🎉 Welcome to FlipAmaz, ${payload.name}! Enjoy 10% off your first purchase using the coupon: WELCOME10.`;
          type = 'AUTH';
        } else if (channel === 'ORDER_PLACED') {
          targetUserId = payload.userId;
          alertMessage = `🛒 Order #${payload.orderId} placed successfully! Tracking ID: ${payload.trackingNumber}. Total: ₹${payload.totalAmount.toLocaleString('en-IN')}`;
          type = 'ORDER';
        } else if (channel === 'ORDER_STATUS_CHANGED') {
          targetUserId = payload.userId;
          alertMessage = `📦 Your order #${payload.orderId} status updated to: ${payload.status}! Tracking ID: ${payload.trackingNumber}`;
          type = 'ORDER';
        }

        if (targetUserId && alertMessage) {
          // Log alert in notification database table
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              message: alertMessage,
              type,
              isRead: false
            }
          });
          console.log(`Logged notification alert for user ${targetUserId}`);
        }
      } catch (err) {
        console.error('Failed to parse and log notification event:', err);
      }
    });

  } catch (err) {
    console.error('Failed to initialize Redis Subscriber:', err);
  }
};

app.listen(port, () => {
  console.log(`Notification Service listening on port ${port}`);
  initRedisSubscriber();
});
