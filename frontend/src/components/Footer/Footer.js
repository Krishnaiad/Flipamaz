'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* Back to top helper link */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
        className={styles.backToTop}
      >
        Back to top
      </button>

      {/* Main Footer Links */}
      <div className={styles.linksSection}>
        <div className={`container ${styles.linksContainer}`}>
          
          <div className={styles.column}>
            <h3 className={styles.colTitle}>Get to Know Us</h3>
            <ul className={styles.colList}>
              <li><Link href="/">About FlipAmaz</Link></li>
              <li><Link href="/">Careers</Link></li>
              <li><Link href="/">Press Releases</Link></li>
              <li><Link href="/">FlipAmaz Science</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.colTitle}>Connect with Us</h3>
            <ul className={styles.colList}>
              <li><Link href="/">Facebook</Link></li>
              <li><Link href="/">Twitter / X</Link></li>
              <li><Link href="/">Instagram</Link></li>
              <li><Link href="/">LinkedIn</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.colTitle}>Make Money with Us</h3>
            <ul className={styles.colList}>
              <li><Link href="/admin">Sell on FlipAmaz</Link></li>
              <li><Link href="/">Supply to FlipAmaz</Link></li>
              <li><Link href="/">Protect & Build Your Brand</Link></li>
              <li><Link href="/">Become an Affiliate</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.colTitle}>Let Us Help You</h3>
            <ul className={styles.colList}>
              <li><Link href="/account">Your Account</Link></li>
              <li><Link href="/account?tab=orders">Your Orders</Link></li>
              <li><Link href="/">Returns & Replacement</Link></li>
              <li><Link href="/">Help & Customer Service</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* Footer Bottom / Branding & Legal */}
      <div className={styles.bottomSection}>
        <div className={`container ${styles.bottomContainer}`}>
          
          {/* Logo and taglines */}
          <div className={styles.brandDetails}>
            <div className={styles.logo}>
              <span className={styles.logoTextMain}>Flip</span>
              <span className={styles.logoTextSub}>Amaz</span>
            </div>
            <p className={styles.tagline}>
              Combining the speed and variety of Flipkart and Amazon to deliver the ultimate e-commerce experience.
            </p>
          </div>

          {/* Payment & Security badges */}
          <div className={styles.paymentInfo}>
            <span className={styles.paymentText}>100% Safe and Secure Checkout</span>
            <div className={styles.paymentBadges}>
              <span className={styles.badge}>Visa</span>
              <span className={styles.badge}>Mastercard</span>
              <span className={styles.badge}>UPI</span>
              <span className={styles.badge}>EMI Available</span>
              <span className={styles.badge}>COD</span>
            </div>
          </div>

        </div>
        
        {/* Copyright */}
        <div className={styles.copyrightBar}>
          <div className="container">
            <p>© {new Date().getFullYear()} FlipAmaz.com, Inc. or its affiliates. All rights reserved. Created for demonstration purposes.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
