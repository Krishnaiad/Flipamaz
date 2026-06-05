const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const app = express();
const port = process.env.PORT || 4005;
const prisma = new PrismaClient();

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

// API: Get Reviews for Product
app.get('/api/reviews', async (req, res) => {
  const productId = Number(req.query.productId);
  if (!productId) return res.status(400).json({ error: 'Missing productId parameter' });

  try {
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });

    // Enrich review entries with mock user name details
    const enrichedReviews = reviews.map(rev => {
      // Mock user names matching the seed data
      const names = { 3: 'Sagar Paul', 4: 'Ananya Sen' };
      return {
        ...rev,
        user: { name: names[rev.userId] || 'Customer' }
      };
    });

    return res.json({ reviews: enrichedReviews });
  } catch (err) {
    console.error('Fetch reviews error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get Questions for Product
app.get('/api/questions', async (req, res) => {
  const productId = Number(req.query.productId);
  if (!productId) return res.status(400).json({ error: 'Missing productId parameter' });

  try {
    const qa = await prisma.questionAnswer.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedQA = qa.map(item => {
      const names = { 3: 'Sagar Paul', 4: 'Ananya Sen' };
      return {
        ...item,
        user: { name: names[item.userId] || 'Customer' },
        seller: item.sellerId ? { name: 'Super Seller Corp' } : null
      };
    });

    return res.json({ questionAnswers: enrichedQA });
  } catch (err) {
    console.error('Fetch questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Write Review
app.post('/api/reviews', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId, rating, title, comment } = req.body;
    if (!productId || !rating) return res.status(400).json({ error: 'Missing productId or rating' });

    const review = await prisma.review.create({
      data: {
        userId: sessionUser.id,
        productId: Number(productId),
        rating: Number(rating),
        title,
        comment
      }
    });

    // Re-calculate the product average rating and rating count
    const allReviews = await prisma.review.findMany({
      where: { productId: Number(productId) },
    });
    
    const count = allReviews.length;
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / count;
    const roundedAvg = Math.round(avg * 10) / 10;

    // Call Catalog Service via HTTP to sync aggregate ratings
    try {
      await axios.put(`http://catalog-service:4002/api/products/${productId}/rating`, {
        ratingAverage: roundedAvg,
        ratingCount: count
      });
    } catch (catalogErr) {
      console.error('Failed to sync aggregate ratings with Catalog Service:', catalogErr.message);
    }

    return res.json({
      review: {
        ...review,
        user: { name: sessionUser.name }
      }
    });
  } catch (err) {
    console.error('Create review error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Ask Question
app.post('/api/questions', async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { productId, question } = req.body;
    if (!productId || !question || !question.trim()) {
      return res.status(400).json({ error: 'Missing productId or question content' });
    }

    const qa = await prisma.questionAnswer.create({
      data: {
        userId: sessionUser.id,
        productId: Number(productId),
        question
      }
    });

    return res.json({
      questionAnswer: {
        ...qa,
        user: { name: sessionUser.name }
      }
    });
  } catch (err) {
    console.error('Ask question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Database Self-Seeding Function
const seedDatabase = async () => {
  try {
    const reviewCount = await prisma.review.count();
    if (reviewCount === 0) {
      console.log('Seeding Rating database with default reviews and Q&As...');
      
      // Seed reviews and Q&As for products 1 to 9
      for (let productId = 1; productId <= 9; productId++) {
        await prisma.review.create({
          data: {
            userId: 3, // Sagar Paul
            productId,
            rating: 5,
            title: 'Simply Incredible!',
            comment: 'Highly recommend this product. Superb build quality and performance. Worth every penny!',
          }
        });

        await prisma.review.create({
          data: {
            userId: 4, // Ananya Sen
            productId,
            rating: 4,
            title: 'Good value for money',
            comment: 'Have been using it for a week. The features are excellent. Still, a solid choice.',
          }
        });

        await prisma.questionAnswer.create({
          data: {
            productId,
            userId: 3,
            question: 'Does this product come with official brand warranty?',
            answer: 'Yes, it comes with a 1-year official brand warranty. You can register it on the brand website using the invoice.',
            sellerId: 2,
          }
        });

        await prisma.questionAnswer.create({
          data: {
            productId,
            userId: 4,
            question: 'What is in the box?',
            answer: 'The box includes the main device, charging cable, user manual, and warranty documentation.',
            sellerId: 2,
          }
        });
      }
      console.log('Rating database seeded successfully!');
    }
  } catch (err) {
    console.error('Failed to seed Rating database:', err);
  }
};

// Start Server
app.listen(port, () => {
  console.log(`Rating Service listening on port ${port}`);
  seedDatabase();
});
