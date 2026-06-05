const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

const app = express();
const port = process.env.PORT || 4001;
const prisma = new PrismaClient();

// Connect to Redis for publishing signup events
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = createClient({ url: redisUrl });
redisClient.on('error', (err) => console.error('Redis error in Auth Service:', err));
redisClient.connect().catch((err) => console.error('Redis connection failed in Auth:', err));

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
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

// API: Check Session
app.get('/api/auth/session', (req, res) => {
  const user = getSessionUser(req);
  return res.json({ user });
});

// API: Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'USER' }
    });

    // Publish event to Redis event bus
    try {
      await redisClient.publish('USER_CREATED', JSON.stringify({
        userId: user.id,
        name: user.name,
        email: user.email
      }));
    } catch (redisErr) {
      console.error('Failed to publish USER_CREATED event:', redisErr);
    }

    // Set Session Cookie
    const sessionData = { id: user.id, email: user.email, name: user.name, role: user.role };
    const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    res.cookie('flipamaz_session', encoded, {
      httpOnly: true,
      secure: false, // In local dev over Nginx gateway
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/'
    });

    return res.json({
      success: true,
      user: sessionData
    });
  } catch (err) {
    console.error('Signup API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Log In
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set Session Cookie
    const sessionData = { id: user.id, email: user.email, name: user.name, role: user.role };
    const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    res.cookie('flipamaz_session', encoded, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000,
      path: '/'
    });

    return res.json({
      user: sessionData
    });
  } catch (err) {
    console.error('Login API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Log Out
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('flipamaz_session', { path: '/' });
  return res.json({ success: true });
});

// API: Get Saved Addresses
app.get('/api/addresses', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: sessionUser.id }
    });
    return res.json({ addresses });
  } catch (err) {
    console.error('Get addresses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Save Address
app.post('/api/addresses', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { label, street, city, state, postalCode, phone, country } = req.body;
    if (!street || !city || !state || !postalCode || !phone) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    const address = await prisma.address.create({
      data: {
        userId: sessionUser.id,
        label: label || 'Home',
        street,
        city,
        state,
        postalCode,
        phone,
        country: country || 'India'
      }
    });

    return res.json({ success: true, address });
  } catch (err) {
    console.error('Post address error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Database Self-Seeding Function
const seedDatabase = async () => {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('Seeding Auth database with default accounts...');
      const passwordHash = await bcrypt.hash('password123', 10);
      
      await prisma.user.create({
        data: {
          email: 'admin@flipamaz.com',
          passwordHash,
          name: 'Admin User',
          role: 'ADMIN',
        },
      });

      await prisma.user.create({
        data: {
          email: 'seller@flipamaz.com',
          passwordHash,
          name: 'Super Seller Corp',
          role: 'SELLER',
        },
      });

      await prisma.user.create({
        data: {
          email: 'customer@flipamaz.com',
          passwordHash,
          name: 'Sagar Paul',
          role: 'USER',
          addresses: {
            create: [
              {
                label: 'Home',
                street: '123 Tech Park St, Sector 5',
                city: 'Kolkata',
                state: 'West Bengal',
                postalCode: '700091',
                phone: '9876543210',
                isDefault: true,
              },
              {
                label: 'Office',
                street: '456 Business Tower, Salt Lake',
                city: 'Kolkata',
                state: 'West Bengal',
                postalCode: '700091',
                phone: '9876543211',
              }
            ]
          }
        },
      });

      await prisma.user.create({
        data: {
          email: 'buyer2@flipamaz.com',
          passwordHash,
          name: 'Ananya Sen',
          role: 'USER',
        }
      });
      console.log('Auth database seeded successfully!');
    }
  } catch (err) {
    console.error('Failed to seed Auth database:', err);
  }
};

// Start Server
app.listen(port, () => {
  console.log(`Auth Service listening on port ${port}`);
  seedDatabase();
});
