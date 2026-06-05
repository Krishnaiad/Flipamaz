const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean database
  await prisma.questionAnswer.deleteMany();
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned existing records.');

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@flipamaz.com',
      passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: 'seller@flipamaz.com',
      passwordHash,
      name: 'Super Seller Corp',
      role: 'SELLER',
    },
  });

  const customer = await prisma.user.create({
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

  const customer2 = await prisma.user.create({
    data: {
      email: 'buyer2@flipamaz.com',
      passwordHash,
      name: 'Ananya Sen',
      role: 'USER',
    }
  });

  console.log('Seeded Users.');

  // Create Categories
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

  console.log('Seeded Categories.');

  // Create Products
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
      })
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
      })
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
      })
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
      })
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
      })
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
      })
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
      })
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
      })
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
      })
    }
  ];

  console.log('Creating products, reviews, and Q&As...');
  for (const prodData of productsData) {
    const product = await prisma.product.create({
      data: {
        ...prodData,
        sellerId: seller.id,
      },
    });

    // Create Reviews
    const rating1 = Math.floor(Math.random() * 2) + 4; // 4 or 5
    const rating2 = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5

    await prisma.review.create({
      data: {
        userId: customer.id,
        productId: product.id,
        rating: rating1,
        title: rating1 === 5 ? 'Simply Incredible!' : 'Excellent purchase',
        comment: `Highly recommend this ${product.brand} product. Superb build quality and performance. Worth every penny!`,
      },
    });

    await prisma.review.create({
      data: {
        userId: customer2.id,
        productId: product.id,
        rating: rating2,
        title: rating2 >= 4 ? 'Good value for money' : 'Decent but expensive',
        comment: `Have been using it for a week. The features are excellent, but I think the price is a bit high. Still, a solid choice.`,
      },
    });

    // Calculate rating averages
    const reviews = await prisma.review.findMany({ where: { productId: product.id } });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        ratingAverage: Math.round(avg * 10) / 10,
        ratingCount: reviews.length,
      },
    });

    // Create Q&A
    await prisma.questionAnswer.create({
      data: {
        productId: product.id,
        userId: customer.id,
        question: `Does this ${product.brand} product come with official brand warranty?`,
        answer: 'Yes, it comes with a 1-year official brand warranty. You can register it on the brand website using the invoice.',
        sellerId: seller.id,
      },
    });

    await prisma.questionAnswer.create({
      data: {
        productId: product.id,
        userId: customer2.id,
        question: 'What is in the box?',
        answer: 'The box includes the main device, charging cable, user manual, and warranty documentation.',
        sellerId: seller.id,
      },
    });
  }

  console.log('Seeded Products, Reviews, and Q&As.');
  console.log('Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
