'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './page.module.css';

export default function CheckoutPage() {
  const { cart, user, clearCart } = useApp();
  const router = useRouter();

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  // Custom new address input
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLabel, setNewLabel] = useState('Home');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD, UPI, CARD
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  // Coupon states
  const [activeCoupon, setActiveCoupon] = useState(null);

  // Checkout states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null); // Set after successful API response

  // Fetch user addresses on load
  useEffect(() => {
    if (!user) {
      router.push('/account?tab=login&redirect=checkout');
      return;
    }

    const fetchAddresses = async () => {
      try {
        const res = await fetch('/api/addresses');
        if (res.ok) {
          const data = await res.json();
          setAddresses(data.addresses || []);
          if (data.addresses && data.addresses.length > 0) {
            const defAddr = data.addresses.find(a => a.isDefault) || data.addresses[0];
            setSelectedAddressId(defAddr.id);
          } else {
            setShowNewAddressForm(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch addresses:', err);
      }
    };

    // Grab applied coupon from localStorage
    const savedCoupon = localStorage.getItem('active_coupon');
    if (savedCoupon) {
      setActiveCoupon(JSON.parse(savedCoupon));
    }

    fetchAddresses();
  }, [user, router]);

  // Calculations
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
  
  let couponSavings = 0;
  if (activeCoupon) {
    if (activeCoupon.discountPercent) {
      couponSavings = Math.round(totalDiscountedPrice * (activeCoupon.discountPercent / 100));
    } else if (activeCoupon.discountFlat) {
      couponSavings = activeCoupon.discountFlat;
    }
  }

  const deliveryCharge = totalDiscountedPrice > 500 ? 0 : 40;
  const finalAmount = totalDiscountedPrice - couponSavings + deliveryCharge;

  // Submit Order Handler
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    let finalAddress = null;

    if (showNewAddressForm) {
      // Validate address input
      if (!newStreet || !newCity || !newState || !newPostalCode || !newPhone) {
        setError('Please fill in all shipping address fields.');
        return;
      }
      finalAddress = {
        label: newLabel,
        street: newStreet,
        city: newCity,
        state: newState,
        postalCode: newPostalCode,
        phone: newPhone,
        country: 'India'
      };
    } else {
      const selected = addresses.find(a => a.id === selectedAddressId);
      if (!selected) {
        setError('Please select or add a shipping address.');
        return;
      }
      finalAddress = {
        label: selected.label,
        street: selected.street,
        city: selected.city,
        state: selected.state,
        postalCode: selected.postalCode,
        phone: selected.phone,
        country: selected.country
      };
    }

    // Validate payment inputs
    if (paymentMethod === 'CARD') {
      if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {
        setError('Please fill in your card details.');
        return;
      }
    } else if (paymentMethod === 'UPI') {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. name@upi).');
        return;
      }
    }

    setSubmitting(true);
    try {
      // If new address was inputted, save it to the DB first
      if (showNewAddressForm) {
        await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalAddress)
        });
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: finalAddress,
          paymentMethod,
          activeCoupon
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPlacedOrder(data.order);
        // Clear global cart state locally and clean coupon code cache
        localStorage.removeItem('active_coupon');
        clearCart();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to place order.');
      }
    } catch (err) {
      console.error('Order checkout error:', err);
      setError('An error occurred during checkout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (placedOrder) {
    return (
      <div className={`container ${styles.successPage}`}>
        <div className={`glass-card ${styles.successCard}`}>
          <span className={styles.successIcon}>🎉</span>
          <h2 className={styles.successTitle}>Order Placed Successfully!</h2>
          <p className={styles.successSubtitle}>Thank you for shopping on FlipAmaz.</p>
          
          <div className={styles.orderSummaryBox}>
            <div className={styles.summaryItem}>
              <span>Order ID:</span>
              <strong>#{placedOrder.id}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Tracking Number:</span>
              <strong>{placedOrder.trackingNumber}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Amount Paid:</span>
              <strong>₹{placedOrder.totalAmount.toLocaleString('en-IN')} ({placedOrder.paymentMethod})</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Estimated Delivery:</span>
              <strong style={{ color: 'var(--success)' }}>
                {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </strong>
            </div>
          </div>

          <div className={styles.successActions}>
            <Link href="/account?tab=orders" className="btn-primary">
              Track Order
            </Link>
            <Link href="/" className="btn-secondary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.checkoutPage}`}>
      
      {/* Forms column */}
      <div className={styles.checkoutCol}>
        <h1 className={styles.pageTitle}>Secure Checkout</h1>
        
        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handlePlaceOrder} className={styles.checkoutForm}>
          
          {/* STEP 1: Shipping Address Selection */}
          <div className={`glass-card ${styles.stepCard}`}>
            <h3 className={styles.stepTitle}>1. Delivery Address</h3>
            
            {addresses.length > 0 && !showNewAddressForm && (
              <div className={styles.addressesList}>
                {addresses.map((addr) => (
                  <label 
                    key={addr.id} 
                    className={`${styles.addressLabel} ${selectedAddressId === addr.id ? styles.selectedAddress : ''}`}
                  >
                    <input
                      type="radio"
                      name="selectedAddress"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className={styles.radioInput}
                    />
                    <div className={styles.addressInfo}>
                      <strong>{addr.label} Address</strong>
                      <p>{addr.street}, {addr.city}, {addr.state} - {addr.postalCode}</p>
                      <p className={styles.phoneText}>Phone: {addr.phone}</p>
                    </div>
                  </label>
                ))}

                <button 
                  type="button" 
                  onClick={() => setShowNewAddressForm(true)} 
                  className={styles.addNewAddrBtn}
                >
                  + Add New Delivery Address
                </button>
              </div>
            )}

            {(showNewAddressForm || addresses.length === 0) && (
              <div className={styles.newAddressForm}>
                <div className={styles.formRow}>
                  <label htmlFor="address-type">Address Type (e.g. Home, Office):</label>
                  <input
                    id="address-type"
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="street-addr">Street Address / Local Area:</label>
                  <input
                    id="street-addr"
                    type="text"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className={styles.formInput}
                    placeholder="Flat No, Wing, Street Area"
                  />
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formRow}>
                    <label htmlFor="city">City:</label>
                    <input
                      id="city"
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label htmlFor="state">State:</label>
                    <input
                      id="state"
                      type="text"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formRow}>
                    <label htmlFor="pincode">Pincode:</label>
                    <input
                      id="pincode"
                      type="text"
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label htmlFor="phone">Phone Number:</label>
                    <input
                      id="phone"
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                {addresses.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setShowNewAddressForm(false)} 
                    className={styles.cancelNewAddrBtn}
                  >
                    Cancel &amp; Select Existing Address
                  </button>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Payment Method */}
          <div className={`glass-card ${styles.stepCard}`}>
            <h3 className={styles.stepTitle}>2. Payment Method</h3>
            
            <div className={styles.paymentsList}>
              {/* Cash On Delivery */}
              <label className={`${styles.paymentLabel} ${paymentMethod === 'COD' ? styles.selectedPayment : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className={styles.radioInput}
                />
                <div className={styles.paymentInfo}>
                  <strong>Cash On Delivery (COD)</strong>
                  <p>Pay cash or scan QR code on delivery. Easy and safe.</p>
                </div>
              </label>

              {/* UPI */}
              <label className={`${styles.paymentLabel} ${paymentMethod === 'UPI' ? styles.selectedPayment : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'UPI'}
                  onChange={() => setPaymentMethod('UPI')}
                  className={styles.radioInput}
                />
                <div className={styles.paymentInfo}>
                  <strong>Instant UPI (PhonePe, GooglePay, Paytm)</strong>
                  <p>Pay instantly using your UPI handler.</p>
                  
                  {paymentMethod === 'UPI' && (
                    <div className={styles.paymentSubForm}>
                      <label htmlFor="upi-id">UPI ID:</label>
                      <input
                        id="upi-id"
                        type="text"
                        placeholder="sagar@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className={styles.formInput}
                      />
                    </div>
                  )}
                </div>
              </label>

              {/* Card Payments */}
              <label className={`${styles.paymentLabel} ${paymentMethod === 'CARD' ? styles.selectedPayment : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'CARD'}
                  onChange={() => setPaymentMethod('CARD')}
                  className={styles.radioInput}
                />
                <div className={styles.paymentInfo}>
                  <strong>Credit / Debit Card</strong>
                  <p>Safe payment using 128-bit SSL encrypted system.</p>

                  {paymentMethod === 'CARD' && (
                    <div className={styles.paymentSubForm}>
                      <div className={styles.formRow}>
                        <label htmlFor="card-name">Cardholder Name:</label>
                        <input
                          id="card-name"
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="card-number">Card Number:</label>
                        <input
                          id="card-number"
                          type="text"
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formRow}>
                          <label htmlFor="card-expiry">Expiry Date:</label>
                          <input
                            id="card-expiry"
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className={styles.formInput}
                          />
                        </div>
                        <div className={styles.formRow}>
                          <label htmlFor="card-cvv">CVV:</label>
                          <input
                            id="card-cvv"
                            type="password"
                            placeholder="***"
                            maxLength="3"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

        </form>
      </div>

      {/* Summary column */}
      <div className={styles.summaryCol}>
        <div className={`glass-card ${styles.priceDetailsCard}`}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>
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
              <span>Coupon Discount ({activeCoupon.code})</span>
              <span className={styles.successText}>-₹{couponSavings.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className={styles.priceRowItem}>
            <span>Delivery Charges</span>
            <span>{deliveryCharge === 0 ? <span className={styles.successText}>FREE</span> : `₹${deliveryCharge}`}</span>
          </div>

          <hr className={styles.divider} />

          <div className={`${styles.priceRowItem} ${styles.totalRow}`}>
            <span>Total Payable</span>
            <span>₹{finalAmount.toLocaleString('en-IN')}</span>
          </div>

          <hr className={styles.divider} />

          <button 
            type="submit" 
            onClick={handlePlaceOrder}
            disabled={submitting || cart.length === 0}
            className={styles.confirmOrderBtn}
          >
            {submitting ? 'Processing Order...' : 'Confirm Order'}
          </button>
        </div>
      </div>

    </div>
  );
}
