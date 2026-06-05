const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

const app = express();
const port = process.env.PORT || 4002;
const prisma = new PrismaClient();

// Connect to Redis for caching catalog results
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = createClient({ url: redisUrl });
redisClient.on('error', (err) => console.error('Redis error in Catalog Service:', err));
redisClient.connect().catch((err) => console.error('Redis connection failed in Catalog:', err));

app.use(cors());
app.use(express.json());

// Helper to flush all catalog caches when products edit occurs
const invalidateCatalogCache = async () => {
  try {
    const keys = await redisClient.keys('catalog:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Flushed ${keys.length} catalog cache keys.`);
    }
  } catch (err) {
    console.error('Failed to flush catalog cache keys:', err);
  }
};

// API: Get Products List (With Caching)
app.get('/api/products', async (req, res) => {
  try {
    const search = req.query.q || '';
    const categorySlug = req.query.category || '';
    const brand = req.query.brand || '';
    const rating = req.query.rating ? Number(req.query.rating) : null;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const sort = req.query.sort || 'popular';

    // Construct a unique Redis cache key based on query filters
    const cacheKey = `catalog:q=${search}:cat=${categorySlug}:brand=${brand}:rat=${rating}:min=${minPrice}:max=${maxPrice}:sort=${sort}`;
    
    // Attempt cache hit
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        // Cache hit! Return data
        return res.json(JSON.parse(cachedData));
      }
    } catch (redisErr) {
      console.error('Redis cache fetch error:', redisErr);
    }

    // Cache miss: Query PostgreSQL
    let whereClause = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: brand || search, mode: 'insensitive' } }
      ];
    }

    if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug }
      });
      if (category) {
        whereClause.categoryId = category.id;
      }
    }

    if (brand) {
      whereClause.brand = { equals: brand, mode: 'insensitive' };
    }

    if (rating) {
      whereClause.ratingAverage = { gte: rating };
    }

    if (minPrice !== null || maxPrice !== null) {
      whereClause.price = {};
      if (minPrice !== null) whereClause.price.gte = minPrice;
      if (maxPrice !== null) whereClause.price.lte = maxPrice;
    }

    let orderBy = {};
    if (sort === 'price-low-high') {
      orderBy = { price: 'asc' };
    } else if (sort === 'price-high-low') {
      orderBy = { price: 'desc' };
    } else if (sort === 'rating') {
      orderBy = { ratingAverage: 'desc' };
    } else {
      orderBy = { ratingCount: 'desc' };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: orderBy,
      include: { category: true }
    });

    const allProducts = await prisma.product.findMany({
      select: { brand: true }
    });
    const uniqueBrands = Array.from(new Set(allProducts.map(p => p.brand).filter(Boolean)));

    const result = { products, brands: uniqueBrands };

    // Set search result inside Redis cache with a 1 minute TTL
    try {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
    } catch (redisErr) {
      console.error('Redis cache save error:', redisErr);
    }

    return res.json(result);
  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get Single Product details (With Caching)
app.get('/api/products/:id', async (req, res) => {
  const productId = Number(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });

  const cacheKey = `product:${productId}`;

  // Try cache hit
  try {
    const cachedProduct = await redisClient.get(cacheKey);
    if (cachedProduct) {
      // Cache hit! Return data
      return res.json(JSON.parse(cachedProduct));
    }
  } catch (redisErr) {
    console.error('Redis single cache get error:', redisErr);
  }

  // Cache miss: Query PostgreSQL
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Set product cache with a 5 minutes TTL
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(product));
    } catch (redisErr) {
      console.error('Redis single cache set error:', redisErr);
    }

    return res.json(product);
  } catch (err) {
    console.error('Fetch single product error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin API: Trigger cache invalidation when product is updated/added/deleted
app.post('/api/products/cache-invalidate', async (req, res) => {
  const { productId } = req.body;
  
  await invalidateCatalogCache();
  if (productId) {
    try {
      await redisClient.del(`product:${productId}`);
      console.log(`Invalidated single cache for product:${productId}`);
    } catch (redisErr) {
      console.error('Failed to invalidate single product cache:', redisErr);
    }
  }
  return res.json({ success: true });
});

// Internal API: Sync product reviews rating average (called by Rating Service)
app.put('/api/products/:id/rating', async (req, res) => {
  const productId = Number(req.params.id);
  const { ratingAverage, ratingCount } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: Number(ratingAverage),
        ratingCount: Number(ratingCount)
      }
    });

    // Invalidate Redis caches
    await invalidateCatalogCache();
    await redisClient.del(`product:${productId}`);

    return res.json({ success: true, product });
  } catch (err) {
    console.error('Update rating count error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Internal API: Decrement Stock (called by Cart/Checkout Service during transactions)
app.put('/api/products/:id/stock-decrement', async (req, res) => {
  const productId = Number(req.params.id);
  const { quantity } = req.body;

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock - quantity }
    });

    // Invalidate caches
    await invalidateCatalogCache();
    await redisClient.del(`product:${productId}`);

    return res.json({ success: true, product: updated });
  } catch (err) {
    console.error('Stock decrement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Database Self-Seeding Function
const seedDatabase = async () => {
  try {
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      console.log('Seeding Catalog database with default categories and products...');
      
      const categoriesData = [
        { name: 'Mobiles', slug: 'mobiles', description: 'Smartphones and mobile accessories' },
        { name: 'Laptops', slug: 'laptops', description: 'Notebooks, ultra-books and workstations' },
        { name: 'Audio', slug: 'audio', description: 'Headphones, earbuds and Bluetooth speakers' },
        { name: 'Wearables', slug: 'wearables', description: 'Smartwatches, fitness bands and accessories' },
        { name: 'Appliances', slug: 'appliances', description: 'Televisions, vacuums and home utilities' },
      ];

      const categories = {};
      for (const cat of categoriesData) {
        categories[cat.slug] = await prisma.category.create({ data: cat });
      }

      const productsData = [
        {
          name: 'iPhone 15 Pro Max (256 GB, Natural Titanium)',
          description: 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever.',
          price: 159900,
          discountPercent: 8,
          stock: 15,
          brand: 'Apple',
          categoryId: categories['mobiles'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1695048132800-4742a048a12e?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'iPhone 15 Pro Max',
            'Display': '6.7-inch Super Retina XDR OLED',
            'Processor': 'A17 Pro Chip with 6-core GPU',
            'Rear Camera': '48MP + 12MP + 12MP',
            'Front Camera': '12MP TrueDepth',
            'Storage': '256 GB',
            'Battery': 'Up to 29 hours video playback'
          }),
          sellerId: 2,
          ratingAverage: 4.7,
          ratingCount: 2
        },
        {
          name: 'Samsung Galaxy S24 Ultra (5G, 12GB RAM, 256GB Storage)',
          description: 'Welcome to the era of mobile AI. With Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity, productivity and possibility.',
          price: 129999,
          discountPercent: 12,
          stock: 20,
          brand: 'Samsung',
          categoryId: categories['mobiles'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'Galaxy S24 Ultra',
            'Display': '6.8-inch Dynamic AMOLED 2X, QHD+',
            'Processor': 'Snapdragon 8 Gen 3 for Galaxy',
            'Rear Camera': '200MP + 50MP + 12MP + 10MP',
            'Front Camera': '12MP',
            'Storage': '256 GB',
            'RAM': '12 GB',
            'S-Pen': 'Included in-box'
          }),
          sellerId: 2,
          ratingAverage: 4.6,
          ratingCount: 2
        },
        {
          name: 'MacBook Pro M3 Max (16-inch, 36GB RAM, 1TB SSD)',
          description: 'The 16-inch MacBook Pro blasts forward with M3 Max, an incredibly advanced chip that brings massive performance and capability for extreme workflows.',
          price: 349900,
          discountPercent: 5,
          stock: 8,
          brand: 'Apple',
          categoryId: categories['laptops'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'MacBook Pro 16"',
            'Display': '16.2-inch Liquid Retina XDR',
            'Processor': 'Apple M3 Max (14-core CPU, 30-core GPU)',
            'Unified Memory': '36 GB',
            'Storage': '1 TB SSD',
            'OS': 'macOS Sonoma',
            'Battery Life': 'Up to 22 hours'
          }),
          sellerId: 2,
          ratingAverage: 4.8,
          ratingCount: 2
        },
        {
          name: 'Dell XPS 15 9530 Laptop (Intel Core i9, 32GB RAM, 1TB SSD)',
          description: 'Designed to inspire. The XPS 15 features an immersive 15.6-inch OLED screen, high-performance 13th Gen Intel Core processors, and NVIDIA GeForce RTX 4060 graphics.',
          price: 245000,
          discountPercent: 15,
          stock: 12,
          brand: 'Dell',
          categoryId: categories['laptops'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'XPS 15 9530',
            'Display': '15.6-inch 3.5K OLED Touchscreen',
            'Processor': 'Intel Core i9-13900H',
            'RAM': '32 GB DDR5',
            'Graphics': 'NVIDIA RTX 4060 8GB GDDR6',
            'Storage': '1 TB SSD',
            'OS': 'Windows 11 Home'
          }),
          sellerId: 2,
          ratingAverage: 4.3,
          ratingCount: 2
        },
        {
          name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
          description: 'Industry-leading noise cancellation, exceptional sound quality, and crystal clear hands-free calling. Sony WH-1000XM5 rewrites the rules of distraction-free listening.',
          price: 29990,
          discountPercent: 20,
          stock: 30,
          brand: 'Sony',
          categoryId: categories['audio'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'WH-1000XM5',
            'Battery Life': 'Up to 30 hours (ANC ON)',
            'Charging Time': 'Quick charge (3 mins for 3 hours)',
            'Drivers': '30mm dome type',
            'Connectivity': 'Bluetooth 5.2, Multipoint connection',
            'Noise Cancellation': 'Dual processor Auto NC Optimizer'
          }),
          sellerId: 2,
          ratingAverage: 4.5,
          ratingCount: 2
        },
        {
          name: 'AirPods Pro (2nd Generation) with USB‑C MagSafe Case',
          description: 'AirPods Pro feature up to 2x more Active Noise Cancellation, plus Adaptive Audio and Transparency mode, for the ultimate immersive listening experience.',
          price: 24900,
          discountPercent: 10,
          stock: 45,
          brand: 'Apple',
          categoryId: categories['audio'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'AirPods Pro (2nd Gen)',
            'Chip': 'Apple H2 headphone chip',
            'Noise Cancellation': 'Active Noise Cancellation & Transparency Mode',
            'Sweat & Water Resistance': 'IP54 dust, sweat, and water resistant',
            'Battery Life': 'Up to 6 hours listening time on a single charge'
          }),
          sellerId: 2,
          ratingAverage: 4.4,
          ratingCount: 2
        },
        {
          name: 'Apple Watch Ultra 2 (GPS + Cellular, 49mm Titanium)',
          description: 'The most rugged and capable Apple Watch. Featuring an all-new S9 SiP, a magical new double tap gesture, and a brighter display.',
          price: 89900,
          discountPercent: 5,
          stock: 14,
          brand: 'Apple',
          categoryId: categories['wearables'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'Apple Watch Ultra 2',
            'Case Size': '49mm aerospace-grade titanium',
            'Display': 'Always-On Retina LTPO OLED (Up to 3000 nits)',
            'Battery Life': 'Up to 36 hours normal use / 72 hours low power mode',
            'Water Resistance': '100m water resistant, swimproof'
          }),
          sellerId: 2,
          ratingAverage: 4.6,
          ratingCount: 2
        },
        {
          name: 'LG C3 55-inch Smart OLED evo TV (4K UHD)',
          description: 'The LG OLED evo C3 is powered by the α9 AI Processor Gen6 for extraordinary picture and performance. Self-lit pixels shine brighter than before.',
          price: 169990,
          discountPercent: 28,
          stock: 10,
          brand: 'LG',
          categoryId: categories['appliances'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'LG OLED55C3PSA',
            'Screen Size': '55 inches',
            'Display Type': 'OLED 4K UHD',
            'Refresh Rate': '120Hz',
            'Processor': 'α9 AI Processor 4K Gen6',
            'Smart TV OS': 'webOS Smart TV'
          }),
          sellerId: 2,
          ratingAverage: 4.7,
          ratingCount: 2
        },
        {
          name: 'Dyson V15 Detect Extra Cordless Vacuum Cleaner',
          description: 'Dyson\'s most powerful, intelligent cordless vacuum. Reveals invisible dust on hard floors. Counts and measures the size of dust particles.',
          price: 65900,
          discountPercent: 12,
          stock: 6,
          brand: 'Dyson',
          categoryId: categories['appliances'].id,
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=60'
          ]),
          specifications: JSON.stringify({
            'Model Name': 'V15 Detect Extra',
            'Suction Power': '240 AW',
            'Run Time': 'Up to 60 minutes',
            'Weight': '3 kg',
            'Filtration': 'Whole-machine HEPA filtration',
            'Laser Dust Reveal': 'Yes'
          }),
          sellerId: 2,
          ratingAverage: 4.5,
          ratingCount: 2
        }
      ];

      for (const prodData of productsData) {
        await prisma.product.create({ data: prodData });
      }
      console.log('Catalog database seeded successfully!');
    }
  } catch (err) {
    console.error('Failed to seed Catalog database:', err);
  }
};

// Start Server
app.listen(port, () => {
  console.log(`Catalog Service listening on port ${port}`);
  seedDatabase();
});
