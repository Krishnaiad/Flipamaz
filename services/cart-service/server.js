const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

const app = express();
const port = process.env.PORT || 4003;
const prisma = new PrismaClient();

// Connect to Redis for Cart Cache & Pub/Sub event bus
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = createClient({ url: redisUrl });
redisClient.on('error', (err) => console.error('Redis error in Cart Service:', err));
redisClient.connect().catch((err) => console.error('Redis connection failed in Cart:', err));

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

// Helper to compile cart items details from Catalog Service
const populateCartItems = async (items) => {
  const populated = [];
  for (const item of items) {
    try {
      const res = await axios.get(`http://catalog-service:4002/api/products/${item.productId}`);
      if (res.data) {
        populated.push({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          product: res.data
        });
      }
    } catch (err) {
      console.error(`Failed to fetch product ${item.productId} details:`, err.message);
      // Fallback in case catalog service is slow or product is missing
      populated.push({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: { id: item.productId, name: 'Product Details Unavailable', price: 0, discountPercent: 0, images: '[""]' }
      });
    }
  }
  return populated;
};

// API: Get Cart
app.get('/api/cart', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.json({ items: [] });

  const cacheKey = `cart:user:${sessionUser.id}`;

  try {
    // Try Redis Cart Cache
    const cachedCart = await redisClient.get(cacheKey);
    if (cachedCart) {
      const parsedItems = JSON.parse(cachedCart);
      const populated = await populateCartItems(parsedItems);
      return res.json({ items: populated });
    }

    // Cache Miss: Query PostgreSQL
    const items = await prisma.cartItem.findMany({
      where: { userId: sessionUser.id }
    });

    // Save to Cache
    await redisClient.setEx(cacheKey, 600, JSON.stringify(items)); // Cache for 10 minutes

    const populated = await populateCartItems(items);
    return res.json({ items: populated });
  } catch (err) {
    console.error('Fetch cart error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Add To Cart
app.post('/api/cart', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ error: 'Missing productId or quantity' });

    const existing = await prisma.cartItem.findFirst({
      where: { userId: sessionUser.id, productId: Number(productId) }
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + Number(quantity) }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          userId: sessionUser.id,
          productId: Number(productId),
          quantity: Number(quantity)
        }
      });
    }

    // Refresh database list & Invalidate Redis Cache
    const items = await prisma.cartItem.findMany({
      where: { userId: sessionUser.id }
    });
    const cacheKey = `cart:user:${sessionUser.id}`;
    await redisClient.setEx(cacheKey, 600, JSON.stringify(items));

    const populated = await populateCartItems(items);
    return res.json({ items: populated });
  } catch (err) {
    console.error('Add to cart error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Update Quantity
app.put('/api/cart', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId, quantity } = req.body;
    const existing = await prisma.cartItem.findFirst({
      where: { userId: sessionUser.id, productId: Number(productId) }
    });

    if (existing) {
      if (Number(quantity) <= 0) {
        await prisma.cartItem.delete({ where: { id: existing.id } });
      } else {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Number(quantity) }
        });
      }
    }

    // Refresh & Sync Cache
    const items = await prisma.cartItem.findMany({
      where: { userId: sessionUser.id }
    });
    const cacheKey = `cart:user:${sessionUser.id}`;
    await redisClient.setEx(cacheKey, 600, JSON.stringify(items));

    const populated = await populateCartItems(items);
    return res.json({ items: populated });
  } catch (err) {
    console.error('Update cart error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Delete Cart Item
app.delete('/api/cart', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId } = req.body;
    await prisma.cartItem.deleteMany({
      where: { userId: sessionUser.id, productId: Number(productId) }
    });

    // Refresh & Sync Cache
    const items = await prisma.cartItem.findMany({
      where: { userId: sessionUser.id }
    });
    const cacheKey = `cart:user:${sessionUser.id}`;
    await redisClient.setEx(cacheKey, 600, JSON.stringify(items));

    const populated = await populateCartItems(items);
    return res.json({ items: populated });
  } catch (err) {
    console.error('Delete cart item error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Merge Guest Cart
app.post('/api/cart/merge', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { guestCart } = req.body;
    if (guestCart && Array.isArray(guestCart)) {
      for (const item of guestCart) {
        const existing = await prisma.cartItem.findFirst({
          where: { userId: sessionUser.id, productId: Number(item.product.id) }
        });

        if (existing) {
          await prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + Number(item.quantity) }
          });
        } else {
          await prisma.cartItem.create({
            data: {
              userId: sessionUser.id,
              productId: Number(item.product.id),
              quantity: Number(item.quantity)
            }
          });
        }
      }
    }

    const items = await prisma.cartItem.findMany({
      where: { userId: sessionUser.id }
    });
    const cacheKey = `cart:user:${sessionUser.id}`;
    await redisClient.setEx(cacheKey, 600, JSON.stringify(items));

    const populated = await populateCartItems(items);
    return res.json({ items: populated });
  } catch (err) {
    console.error('Merge cart error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Clear Cart
app.post('/api/cart/clear', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await prisma.cartItem.deleteMany({ where: { userId: sessionUser.id } });
    await redisClient.del(`cart:user:${sessionUser.id}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('Clear cart error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Transactional Checkout
app.post('/api/checkout', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { address, paymentMethod, activeCoupon } = req.body;
    if (!address || !paymentMethod) return res.status(400).json({ error: 'Missing shipping address or payment method' });

    // Fetch user cart
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: sessionUser.id }
    });

    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    // Populates product details from Catalog Service in parallel
    const populatedItems = await populateCartItems(cartItems);

    let totalAmount = 0;
    const orderItemsToCreate = [];

    // Verify stock and compile details
    for (const item of populatedItems) {
      const product = item.product;
      
      // Stock verification & decrement via Catalog Service HTTP API
      try {
        const stockRes = await axios.put(`http://catalog-service:4002/api/products/${product.id}/stock-decrement`, {
          quantity: item.quantity
        });
      } catch (stockErr) {
        return res.status(400).json({ 
          error: stockErr.response?.data?.error || `Product "${product.name}" is out of stock.` 
        });
      }

      const discountedPrice = Math.round(product.price * (1 - product.discountPercent / 100));
      totalAmount += discountedPrice * item.quantity;

      const imgArr = JSON.parse(product.images);
      orderItemsToCreate.push({
        productId: product.id,
        name: product.name,
        price: discountedPrice,
        quantity: item.quantity,
        image: imgArr[0] || ''
      });
    }

    // Coupon savings math
    let discountAmount = 0;
    if (activeCoupon) {
      if (activeCoupon.discountPercent) {
        discountAmount = Math.round(totalAmount * (activeCoupon.discountPercent / 100));
      } else if (activeCoupon.discountFlat) {
        discountAmount = activeCoupon.discountFlat;
      }
    }

    const finalPrice = Math.max(0, totalAmount - discountAmount);
    const deliveryCharge = finalPrice > 500 ? 0 : 40;
    const finalAmount = finalPrice + deliveryCharge;

    const trackingNumber = 'FA' + Math.floor(10000000 + Math.random() * 90000000);

    // Create Order inside Orders Database schema
    const order = await prisma.order.create({
      data: {
        userId: sessionUser.id,
        status: 'PROCESSING',
        totalAmount: finalAmount,
        discountAmount,
        paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
        paymentMethod,
        shippingAddress: JSON.stringify(address),
        trackingNumber,
        orderItems: {
          create: orderItemsToCreate
        }
      },
      include: {
        orderItems: true
      }
    });

    // Clear cart items in DB & Cache
    await prisma.cartItem.deleteMany({ where: { userId: sessionUser.id } });
    await redisClient.del(`cart:user:${sessionUser.id}`);

    // Publish ORDER_PLACED event to Redis Event Bus
    try {
      await redisClient.publish('ORDER_PLACED', JSON.stringify({
        orderId: order.id,
        userId: sessionUser.id,
        totalAmount: order.totalAmount,
        trackingNumber: order.trackingNumber,
        buyerName: sessionUser.name,
        buyerEmail: sessionUser.email
      }));
    } catch (redisErr) {
      console.error('Failed to publish ORDER_PLACED event:', redisErr);
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Checkout API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Cart Service listening on port ${port}`);
});
