'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './page.module.css';

export default function CartPage() {
  const { cart, updateCartQuantity, removeFromCart, user } = useApp();
  const router = useRouter();

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null); // { code, discountPercent, discountFlat }
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Item math
  const itemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalOriginalPrice = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const totalDiscountedPrice = cart.reduce((acc, item) => {
    const discountedItemPrice = Math.round(
      item.product.price * (1 - item.product.discountPercent / 100)
    );
    return acc + discountedItemPrice * item.quantity;
  }, 0);

  const productSavings = totalOriginalPrice - totalDiscountedPrice;
  
  // Delivery Charge logic (Free over ₹500, like Flipkart/Amazon)
  const deliveryCharge = totalDiscountedPrice > 500 || totalDiscountedPrice === 0 ? 0 : 40;

  // Coupon discount math
  let couponSavings = 0;
  if (activeCoupon) {
    if (activeCoupon.discountPercent) {
      couponSavings = Math.round(totalDiscountedPrice * (activeCoupon.discountPercent / 100));
    } else if (activeCoupon.discountFlat) {
      couponSavings = activeCoupon.discountFlat;
    }
  }

  const finalAmount = totalDiscountedPrice - couponSavings + deliveryCharge;

  // Coupon codes list
  const validCoupons = {
    'WELCOME10': { code: 'WELCOME10', discountPercent: 10 },
    'FLIPAMAZ100': { code: 'FLIPAMAZ100', discountFlat: 100 },
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (validCoupons[code]) {
      setActiveCoupon(validCoupons[code]);
      const benefit = validCoupons[code].discountPercent 
        ? `${validCoupons[code].discountPercent}% off` 
        : `flat ₹${validCoupons[code].discountFlat} discount`;
      setCouponSuccess(`Coupon "${code}" applied! You saved ${benefit}.`);
    } else {
      setCouponError('Invalid coupon code. Try WELCOME10 or FLIPAMAZ100');
      setActiveCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setActiveCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  };

  const handleCheckoutRedirect = () => {
    if (!user) {
      // Redirect to login page and remember to return to checkout
      router.push('/account?tab=login&redirect=checkout');
    } else {
      // Store coupon data in local storage temporarily to fetch at checkout
      if (activeCoupon) {
        localStorage.setItem('active_coupon', JSON.stringify(activeCoupon));
      } else {
        localStorage.removeItem('active_coupon');
      }
      router.push('/checkout');
    }
  };

  if (cart.length === 0) {
    return (
      <div className={`container ${styles.emptyCartPage}`}>
        <div className={`glass-card ${styles.emptyCartCard}`}>
          <span className={styles.emptyCartIcon}>🛒</span>
          <h2>Your Cart is Empty!</h2>
          <p>Add items to it now to grab the best deals on mobiles, laptops, and more.</p>
          <Link href="/search" className="btn-primary">
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.cartPage}`}>
      
      {/* Items Section */}
      <div className={styles.cartItemsCol}>
        <h1 className={styles.pageTitle}>Shopping Cart ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})</h1>
        
        <div className={styles.itemsList}>
          {cart.map((item) => {
            const product = item.product;
            const images = JSON.parse(product.images);
            const mainImage = images[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600';
            const itemDiscountedPrice = Math.round(product.price * (1 - product.discountPercent / 100));

            return (
              <div key={item.id} className={`glass-card ${styles.cartItemCard}`}>
                
                {/* Product Detail info */}
                <div className={styles.itemMain}>
                  <img src={mainImage} alt={product.name} className={styles.itemImage} />
                  <div className={styles.itemInfo}>
                    <span className={styles.brand}>{product.brand}</span>
                    <Link href={`/product/${product.id}`} className={styles.itemName}>
                      {product.name}
                    </Link>
                    <div className={styles.priceRow}>
                      <span className={styles.itemPrice}>₹{itemDiscountedPrice.toLocaleString('en-IN')}</span>
                      {product.discountPercent > 0 && (
                        <>
                          <span className={styles.itemOriginalPrice}>₹{product.price.toLocaleString('en-IN')}</span>
                          <span className={styles.itemDiscount}>{product.discountPercent}% Off</span>
                        </>
                      )}
                    </div>
                    <span className={styles.assuredBadge}>FlipAmaz Assured ✔</span>
                  </div>
                </div>

                {/* Adjusting Quantity Controls */}
                <div className={styles.itemActions}>
                  <div className={styles.quantityControls}>
                    <button 
                      onClick={() => updateCartQuantity(product.id, item.quantity - 1)}
                      className={styles.quantityBtn}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className={styles.quantityValue}>{item.quantity}</span>
                    <button 
                      onClick={() => updateCartQuantity(product.id, item.quantity + 1)}
                      className={styles.quantityBtn}
                      disabled={item.quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>

                  <button 
                    onClick={() => removeFromCart(product.id)}
                    className={styles.removeBtn}
                  >
                    Remove Item
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Summary section */}
      <div className={styles.summaryCol}>
        
        {/* Coupon Card */}
        <div className={`glass-card ${styles.couponCard}`}>
          <h3>Apply Coupon Code</h3>
          {activeCoupon ? (
            <div className={styles.appliedCoupon}>
              <div className={styles.couponInfo}>
                <span className={styles.couponBadge}>⚡ {activeCoupon.code}</span>
                <span className={styles.couponSavingsText}>-₹{couponSavings.toLocaleString('en-IN')}</span>
              </div>
              <button onClick={handleRemoveCoupon} className={styles.removeCouponBtn}>
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className={styles.couponForm}>
              <input
                type="text"
                placeholder="e.g. WELCOME10, FLIPAMAZ100"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className={styles.couponInput}
              />
              <button type="submit" className={styles.couponApplyBtn}>
                Apply
              </button>
            </form>
          )}
          {couponError && <p className={styles.couponError}>{couponError}</p>}
          {couponSuccess && <p className={styles.couponSuccess}>{couponSuccess}</p>}
        </div>

        {/* Pricing Summary Detail Card */}
        <div className={`glass-card ${styles.priceDetailsCard}`}>
          <h2 className={styles.summaryTitle}>Price Details</h2>
          <hr className={styles.divider} />
          
          <div className={styles.priceRowItem}>
            <span>Price ({itemsCount} items)</span>
            <span>₹{totalOriginalPrice.toLocaleString('en-IN')}</span>
          </div>

          <div className={styles.priceRowItem}>
            <span>Product Discount</span>
            <span className={styles.successText}>-₹{productSavings.toLocaleString('en-IN')}</span>
          </div>

          {activeCoupon && (
            <div className={styles.priceRowItem}>
              <span>Coupon Discount</span>
              <span className={styles.successText}>-₹{couponSavings.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className={styles.priceRowItem}>
            <span>Delivery Charges</span>
            <span>{deliveryCharge === 0 ? <span className={styles.successText}>FREE</span> : `₹${deliveryCharge}`}</span>
          </div>

          <hr className={styles.divider} />

          <div className={`${styles.priceRowItem} ${styles.totalRow}`}>
            <span>Total Amount</span>
            <span>₹{finalAmount.toLocaleString('en-IN')}</span>
          </div>

          <hr className={styles.divider} />

          {productSavings + couponSavings > 0 && (
            <p className={styles.savingsNotification}>
              🎉 You will save <strong>₹{(productSavings + couponSavings).toLocaleString('en-IN')}</strong> on this order!
            </p>
          )}

          <button onClick={handleCheckoutRedirect} className={styles.placeOrderBtn}>
            Place Order
          </button>
        </div>

      </div>

    </div>
  );
}
