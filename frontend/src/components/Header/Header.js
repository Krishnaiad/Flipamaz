'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, cart, wishlist, searchQuery, setSearchQuery, theme, toggleTheme, logout } = useApp();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const router = useRouter();
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Fetch search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Get top 5 suggestions
          setSuggestions(data.products.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle outside clicks to close suggestion, user, and notification menus
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications for active user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleSuggestionClick = (product) => {
    setSearchQuery(product.name);
    setShowSuggestions(false);
    router.push(`/product/${product.id}`);
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    router.push('/');
  };

  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <header className={styles.header}>
      {/* Top Banner (Flipkart Deals Announcement Banner) */}
      <div className={styles.topBanner}>
        <span>✨ Mega Summer Sale is LIVE! Get up to 40% off on Laptops & Electronics. Shop Now! ✨</span>
      </div>

      {/* Main Header Bar */}
      <div className={styles.mainHeader}>
        <div className={`container ${styles.headerContainer}`}>
          
          {/* Logo (Amazon-Flipkart hybrid styling) */}
          <Link href="/" className={styles.logoLink}>
            <div className={styles.logo}>
              <span className={styles.logoTextMain}>Flip</span>
              <span className={styles.logoTextSub}>Amaz</span>
              <div className={styles.logoSubText}>Plus ⚡</div>
            </div>
          </Link>

          {/* Search Bar Container */}
          <div className={styles.searchContainer} ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <input
                type="text"
                placeholder="Search for products, brands and more..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            </form>

            {/* Auto-suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className={styles.suggestionsDropdown}>
                {suggestions.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSuggestionClick(product)}
                    className={styles.suggestionItem}
                  >
                    <span className={styles.suggestionName}>{product.name}</span>
                    <span className={styles.suggestionCategory}>in {product.category.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Navigation */}
          <div className={styles.navActions}>
            
            {/* Dark/Light mode toggle */}
            <button onClick={toggleTheme} className={styles.actionBtn} aria-label="Toggle Theme">
              {theme === 'light' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              )}
            </button>

            {/* Account / Authentication Menu */}
            <div className={styles.userMenuContainer} ref={userMenuRef}>
              {user ? (
                <>
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className={styles.userMenuBtn}>
                    <span className={styles.userNameText}>Hello, {user.name.split(' ')[0]}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                  {showUserMenu && (
                    <div className={styles.userDropdown}>
                      <Link href="/account" onClick={() => setShowUserMenu(false)} className={styles.dropdownLink}>
                        My Profile
                      </Link>
                      <Link href="/account?tab=orders" onClick={() => setShowUserMenu(false)} className={styles.dropdownLink}>
                        Orders History
                      </Link>
                      {user.role === 'ADMIN' && (
                        <Link href="/admin" onClick={() => setShowUserMenu(false)} className={styles.dropdownLink}>
                          Admin Dashboard
                        </Link>
                      )}
                      <button onClick={handleLogout} className={styles.logoutBtn}>
                        Log Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link href="/account?tab=login" className={styles.loginBtn}>
                  Login
                </Link>
              )}
            </div>

            {/* Notifications Bell */}
            {user && (
              <div className={styles.notificationContainer} ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className={styles.actionBtn}
                  aria-label="Notifications"
                >
                  <div className={styles.badgeWrapper}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                  </div>
                </button>
                {showNotifications && (
                  <div className={styles.notificationDropdown}>
                    <div className={styles.notificationHeader}>
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllAsRead} className={styles.markReadBtn}>
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className={styles.notificationList}>
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`${styles.notificationItem} ${n.isRead ? styles.readAlert : styles.unreadAlert}`}
                          >
                            <div className={styles.notificationType}>
                              {n.type === 'AUTH' && '👤'}
                              {n.type === 'ORDER' && '📦'}
                              {n.type === 'INFO' && 'ℹ️'}
                            </div>
                            <div className={styles.notificationBody}>
                              <p className={styles.notificationText}>{n.message}</p>
                              <span className={styles.notificationTime}>
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={styles.emptyNotifications}>
                          <span>🔔</span>
                          <p>No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wishlist */}
            <Link href="/account?tab=wishlist" className={styles.actionBtn}>
              <div className={styles.badgeWrapper}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                {wishlist.length > 0 && <span className={styles.badge}>{wishlist.length}</span>}
              </div>
            </Link>

            {/* Cart */}
            <Link href="/cart" className={styles.cartLink}>
              <div className={styles.badgeWrapper}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                {totalCartItems > 0 && <span className={styles.badge}>{totalCartItems}</span>}
              </div>
              <span className={styles.cartText}>Cart</span>
            </Link>

          </div>
        </div>
      </div>

      {/* Categories Sub Header (Amazon Style) */}
      <div className={styles.categoriesBar}>
        <div className={`container ${styles.categoriesContainer}`}>
          <Link href="/search" className={styles.categoryItem}>All Products</Link>
          <Link href="/search?category=mobiles" className={styles.categoryItem}>Mobiles</Link>
          <Link href="/search?category=laptops" className={styles.categoryItem}>Laptops</Link>
          <Link href="/search?category=audio" className={styles.categoryItem}>Audio</Link>
          <Link href="/search?category=wearables" className={styles.categoryItem}>Wearables</Link>
          <Link href="/search?category=appliances" className={styles.categoryItem}>Appliances</Link>
        </div>
      </div>
    </header>
  );
}
