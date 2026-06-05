'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import StarRating from '../StarRating/StarRating';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart } = useApp();
  
  const isWishlisted = wishlist.includes(product.id);
  const images = JSON.parse(product.images);
  const mainImage = images[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600';
  
  // Calculate discount price
  const discountedPrice = Math.round(product.price * (1 - product.discountPercent / 100));
  const hasDiscount = product.discountPercent > 0;

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <div className={`glass-card ${styles.card}`}>
      {/* Wishlist Icon */}
      <button 
        onClick={handleWishlistClick} 
        className={`${styles.wishlistBtn} ${isWishlisted ? styles.wishlisted : ''}`}
        aria-label="Add to Wishlist"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>

      <Link href={`/product/${product.id}`} className={styles.cardLink}>
        {/* Product Image */}
        <div className={styles.imageWrapper}>
          <img 
            src={mainImage} 
            alt={product.name}
            className={styles.image}
            loading="lazy"
          />
          {hasDiscount && (
            <span className={styles.discountBadge}>{product.discountPercent}% OFF</span>
          )}
        </div>

        {/* Product Info */}
        <div className={styles.info}>
          <span className={styles.brand}>{product.brand}</span>
          <h3 className={styles.title}>{product.name}</h3>
          
          {/* Ratings */}
          <div className={styles.ratingBlock}>
            <StarRating rating={product.ratingAverage} size={14} />
            <span className={styles.ratingCount}>({product.ratingCount})</span>
          </div>

          {/* Pricing Block (Flipkart comparisons) */}
          <div className={styles.priceBlock}>
            <span className={styles.price}>₹{discountedPrice.toLocaleString('en-IN')}</span>
            {hasDiscount && (
              <>
                <span className={styles.originalPrice}>₹{product.price.toLocaleString('en-IN')}</span>
                <span className={styles.discountText}>{product.discountPercent}% off</span>
              </>
            )}
          </div>
          
          {/* Flipkart Assured Badging (Simulated) */}
          <div className={styles.badgeRow}>
            <span className={styles.assuredBadge}>FlipAmaz Assured ✔</span>
          </div>
        </div>
      </Link>

      {/* Add To Cart overlay trigger */}
      <div className={styles.actions}>
        <button onClick={handleAddToCart} className={styles.addToCartBtn}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}
