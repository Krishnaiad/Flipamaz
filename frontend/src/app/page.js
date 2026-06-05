import React from 'react';
import Link from 'next/link';
import Carousel from '@/components/Carousel/Carousel';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './page.module.css';

export const revalidate = 60; // Revalidate home page cache every minute

export default async function HomePage() {
  let deals = [];
  let recommendations = [];

  try {
    const res = await fetch('http://catalog-service:4002/api/products', { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const allProducts = data.products || [];
      // Fetch high-discount products for "Deals of the Day"
      deals = allProducts.filter(p => p.discountPercent >= 10).slice(0, 6);
      // Fetch highly-rated products for "Recommended for You"
      recommendations = allProducts.filter(p => p.ratingAverage >= 4).slice(0, 8);
    }
  } catch (err) {
    console.error('Failed to fetch products in HomePage:', err);
  }

  // Category Icons Mock Data (similar to Flipkart category shortcuts)
  const categoryShortcuts = [
    { name: 'Mobiles', slug: 'mobiles', emoji: '📱', color: '#eef2ff' },
    { name: 'Laptops', slug: 'laptops', emoji: '💻', color: '#fef2f2' },
    { name: 'Audio & Buds', slug: 'audio', emoji: '🎧', color: '#ecfdf5' },
    { name: 'Wearables', slug: 'wearables', emoji: '⌚', color: '#fffbeb' },
    { name: 'Appliances', slug: 'appliances', emoji: '📺', color: '#fdf2f8' },
  ];

  return (
    <div className={styles.homeContainer}>
      
      {/* Category Shortcut Grid (Flipkart style) */}
      <section className={styles.shortcutsSection}>
        <div className={`container ${styles.shortcutsContainer}`}>
          {categoryShortcuts.map((cat, idx) => (
            <Link 
              key={idx} 
              href={`/search?category=${cat.slug}`}
              className={styles.shortcutCard}
              style={{ '--cat-bg': cat.color }}
            >
              <span className={styles.shortcutEmoji}>{cat.emoji}</span>
              <span className={styles.shortcutName}>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Hero Carousel Banners (Amazon style) */}
      <Carousel />

      {/* Deals of the Day (Flipkart style deals widget) */}
      <section className={styles.dealsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.headerLeft}>
              <h2 className={styles.sectionTitle}>Deals of the Day 🔥</h2>
              <span className={styles.timerBadge}>Offers ending soon!</span>
            </div>
            <Link href="/search?sort=discount" className={styles.viewAllBtn}>
              View All
            </Link>
          </div>
          
          <div className={styles.productSlider}>
            {deals.map((product) => (
              <div key={product.id} className={styles.sliderItem}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Special Promo Banner (Glassmorphism layout) */}
      <section className={styles.promoSection}>
        <div className="container">
          <div className={`glass-card ${styles.promoCard}`}>
            <div className={styles.promoContent}>
              <span className={styles.promoBadge}>F-Assured Security</span>
              <h3 className={styles.promoTitle}>Shop Safely with Zero-Risk Guarantee</h3>
              <p className={styles.promoText}>
                Enjoy 7-day hassle-free replacements, secure payment gateways, and track your orders in real-time. Able to handle high load checkouts seamlessly.
              </p>
              <div className={styles.promoActions}>
                <Link href="/search" className="btn-primary">
                  Start Shopping
                </Link>
              </div>
            </div>
            <div className={styles.promoVisual}>
              <div className={styles.circleGrad1}></div>
              <div className={styles.circleGrad2}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended for You Grid (Amazon style Recommendations) */}
      <section className={styles.recommendationsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recommended for You ✨</h2>
            <span className={styles.sectionSubtitle}>Based on customer top-ratings</span>
          </div>

          <div className={styles.productGrid}>
            {recommendations.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
