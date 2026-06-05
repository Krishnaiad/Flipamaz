import React from 'react';
import { notFound } from 'next/navigation';
import ProductDetailsClient from './ProductDetailsClient';

async function getProductData(productId) {
  try {
    // 1. Fetch product from catalog service
    const productRes = await fetch(`http://catalog-service:4002/api/products/${productId}`, { next: { revalidate: 10 } });
    if (!productRes.ok) return null;
    const product = await productRes.json();

    // 2. Fetch reviews from rating service
    let reviews = [];
    try {
      const reviewsRes = await fetch(`http://rating-service:4005/api/reviews?productId=${productId}`, { next: { revalidate: 10 } });
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        reviews = data.reviews || [];
      }
    } catch (e) {
      console.error('Failed to fetch reviews for product:', productId, e);
    }

    // 3. Fetch questions from rating service
    let questionAnswers = [];
    try {
      const qaRes = await fetch(`http://rating-service:4005/api/questions?productId=${productId}`, { next: { revalidate: 10 } });
      if (qaRes.ok) {
        const data = await qaRes.json();
        questionAnswers = data.questionAnswers || [];
      }
    } catch (e) {
      console.error('Failed to fetch Q&As for product:', productId, e);
    }

    // Add mock seller details
    const seller = { name: 'Super Seller Corp', role: 'SELLER' };

    // 4. Fetch similar products from catalog service
    let similarProducts = [];
    try {
      const similarRes = await fetch(`http://catalog-service:4002/api/products?category=${product.category.slug}`, { next: { revalidate: 60 } });
      if (similarRes.ok) {
        const data = await similarRes.json();
        const allInCategory = data.products || [];
        similarProducts = allInCategory.filter(p => p.id !== productId).slice(0, 4);
      }
    } catch (e) {
      console.error('Failed to fetch similar products:', e);
    }

    return {
      product: {
        ...product,
        seller,
        reviews,
        questionAnswers
      },
      similarProducts
    };
  } catch (err) {
    console.error('Error fetching product aggregation:', err);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const productId = Number(id);
  if (isNaN(productId)) return { title: 'Product Not Found - FlipAmaz' };

  try {
    const res = await fetch(`http://catalog-service:4002/api/products/${productId}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: 'Product Not Found - FlipAmaz' };
    const product = await res.json();
    return {
      title: `${product.name} - Buy at Best Price on FlipAmaz`,
      description: product.description.slice(0, 160)
    };
  } catch (err) {
    return { title: 'FlipAmaz' };
  }
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return notFound();
  }

  const data = await getProductData(productId);
  if (!data) {
    return notFound();
  }

  return (
    <ProductDetailsClient 
      product={data.product} 
      similarProducts={data.similarProducts} 
    />
  );
}
