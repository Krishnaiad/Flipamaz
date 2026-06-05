'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './page.module.css';

function AccountDashboard() {
  const { user, login, signup, wishlist } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab tracking (profile, orders, wishlist, login)
  const initialTab = searchParams.get('tab') || 'profile';
  const redirectPath = searchParams.get('redirect') || '';

  const [activeTab, setActiveTab] = useState(user ? initialTab : 'login');
  
  // Auth Form states
  const [isRegisterMode, setIsRegisterMode] = useState(initialTab === 'signup');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Orders states
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Wishlist products state
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState([]);

  // Sync tab with URL
  useEffect(() => {
    if (user) {
      setActiveTab(searchParams.get('tab') || 'profile');
    } else {
      setActiveTab('login');
      if (searchParams.get('tab') === 'signup') {
        setIsRegisterMode(true);
      }
    }
  }, [searchParams, user]);

  // Load orders if on orders tab
  useEffect(() => {
    if (user && activeTab === 'orders') {
      const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
          const res = await fetch('/api/orders');
          if (res.ok) {
            const data = await res.json();
            setOrders(data.orders || []);
          }
        } catch (err) {
          console.error('Failed to fetch orders:', err);
        } finally {
          setOrdersLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user, activeTab]);

  // Load addresses if on profile tab
  useEffect(() => {
    if (user && activeTab === 'profile') {
      const fetchAddresses = async () => {
        try {
          const res = await fetch('/api/addresses');
          if (res.ok) {
            const data = await res.json();
            setAddresses(data.addresses || []);
          }
        } catch (err) {
          console.error('Failed to fetch addresses:', err);
        }
      };
      fetchAddresses();
    }
  }, [user, activeTab]);

  // Load wishlist products details
  useEffect(() => {
    if (activeTab === 'wishlist') {
      if (wishlist.length === 0) {
        setWishlistProducts([]);
        return;
      }
      const fetchWishlistProducts = async () => {
        setWishlistLoading(true);
        try {
          const res = await fetch('/api/products');
          if (res.ok) {
            const data = await res.json();
            // Filter products that are in the user's wishlist
            const filtered = data.products.filter(p => wishlist.includes(p.id));
            setWishlistProducts(filtered);
          }
        } catch (err) {
          console.error('Failed to fetch wishlist products:', err);
        } finally {
          setWishlistLoading(false);
        }
      };
      fetchWishlistProducts();
    }
  }, [activeTab, wishlist]);

  // Login/Signup Submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    if (isRegisterMode) {
      if (!authName || !authEmail || !authPassword) {
        setAuthError('All fields are required.');
        setAuthSubmitting(false);
        return;
      }
      const res = await signup(authName, authEmail, authPassword);
      if (res.success) {
        router.push(redirectPath ? `/${redirectPath}` : '/account?tab=profile');
      } else {
        setAuthError(res.error || 'Registration failed');
      }
    } else {
      if (!authEmail || !authPassword) {
        setAuthError('Please fill in both email and password.');
        setAuthSubmitting(false);
        return;
      }
      const res = await login(authEmail, authPassword);
      if (res.success) {
        router.push(redirectPath ? `/${redirectPath}` : '/account?tab=profile');
      } else {
        setAuthError(res.error || 'Login failed');
      }
    }
    setAuthSubmitting(false);
  };

  const handleTabChange = (tabName) => {
    router.push(`/account?tab=${tabName}`);
  };

  // If NOT logged in, show Login/Signup panel
  if (!user) {
    return (
      <div className={`container ${styles.authPage}`}>
        <div className={`glass-card ${styles.authCard}`}>
          
          <div className={styles.authTabs}>
            <button 
              onClick={() => { setIsRegisterMode(false); setAuthError(''); }}
              className={`${styles.authTabBtn} ${!isRegisterMode ? styles.activeAuthTab : ''}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsRegisterMode(true); setAuthError(''); }}
              className={`${styles.authTabBtn} ${isRegisterMode ? styles.activeAuthTab : ''}`}
            >
              Register
            </button>
          </div>

          <h2 className={styles.authTitle}>
            {isRegisterMode ? 'Create FlipAmaz Account' : 'Welcome Back to FlipAmaz'}
          </h2>
          <p className={styles.authSubtitle}>
            {isRegisterMode ? 'Get started on the ultimate e-commerce hybrid experience.' : 'Sign in to access your orders, cart, and wishlist.'}
          </p>

          {authError && <div className={styles.errorText}>{authError}</div>}

          <form onSubmit={handleAuthSubmit} className={styles.authForm}>
            {isRegisterMode && (
              <div className={styles.formRow}>
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Enter your name..."
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className={styles.formInput}
                  required
                />
              </div>
            )}
            <div className={styles.formRow}>
              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="customer@flipamaz.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formRow}>
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder="password123"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>

            <button type="submit" disabled={authSubmitting} className={styles.authSubmitBtn}>
              {authSubmitting ? 'Processing...' : isRegisterMode ? 'Register Account' : 'Sign In'}
            </button>
          </form>

          <p className={styles.demoCredits}>
            <strong>Demo Accounts (Password: password123):</strong><br />
            • Customer: customer@flipamaz.com<br />
            • Admin/Seller: admin@flipamaz.com
          </p>
        </div>
      </div>
    );
  }

  // If LOGGED IN, show Account Dashboard
  return (
    <div className={`container ${styles.dashboardPage}`}>
      
      {/* Sidebar Controls */}
      <aside className={`glass-card ${styles.sidebar}`}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className={styles.profileMeta}>
            <span className={styles.profileWelcome}>Welcome,</span>
            <strong className={styles.profileName}>{user.name}</strong>
            <span className={styles.profileRoleBadge}>{user.role}</span>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <button 
            onClick={() => handleTabChange('profile')} 
            className={`${styles.navItem} ${activeTab === 'profile' ? styles.activeNavItem : ''}`}
          >
            My Profile
          </button>
          <button 
            onClick={() => handleTabChange('orders')} 
            className={`${styles.navItem} ${activeTab === 'orders' ? styles.activeNavItem : ''}`}
          >
            Order History
          </button>
          <button 
            onClick={() => handleTabChange('wishlist')} 
            className={`${styles.navItem} ${activeTab === 'wishlist' ? styles.activeNavItem : ''}`}
          >
            My Wishlist ({wishlist.length})
          </button>
        </nav>
      </aside>

      {/* Main Panel Content */}
      <section className={styles.mainContent}>
        
        {/* VIEW: Profile */}
        {activeTab === 'profile' && (
          <div className={`glass-card ${styles.panelCard}`}>
            <h2 className={styles.panelTitle}>Personal Information</h2>
            <hr className={styles.divider} />
            <div className={styles.profileGrid}>
              <div className={styles.profileField}>
                <span>Full Name:</span>
                <strong>{user.name}</strong>
              </div>
              <div className={styles.profileField}>
                <span>Email Address:</span>
                <strong>{user.email}</strong>
              </div>
              <div className={styles.profileField}>
                <span>Account Role:</span>
                <strong>{user.role}</strong>
              </div>
            </div>

            <h2 className={styles.panelTitle} style={{ marginTop: '30px' }}>Saved Delivery Addresses</h2>
            <hr className={styles.divider} />
            <div className={styles.addressesGrid}>
              {addresses.length > 0 ? (
                addresses.map((addr) => (
                  <div key={addr.id} className={styles.addressCard}>
                    <strong>{addr.label}</strong>
                    <p>{addr.street}</p>
                    <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                    <p>Phone: {addr.phone}</p>
                  </div>
                ))
              ) : (
                <p>No saved addresses yet. You will add them during checkout!</p>
              )}
            </div>
          </div>
        )}

        {/* VIEW: Orders History */}
        {activeTab === 'orders' && (
          <div className={styles.ordersContainer}>
            <h2 className={styles.panelTitle}>Your Orders</h2>
            {ordersLoading ? (
              <p>Loading your orders...</p>
            ) : orders.length > 0 ? (
              <div className={styles.ordersList}>
                {orders.map((order) => (
                  <div key={order.id} className={`glass-card ${styles.orderCard}`}>
                    <div className={styles.orderHeader}>
                      <div>
                        <span className={styles.orderLabel}>ORDER PLACED</span>
                        <strong className={styles.orderVal}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </strong>
                      </div>
                      <div>
                        <span className={styles.orderLabel}>TOTAL PRICE</span>
                        <strong className={styles.orderVal}>₹{order.totalAmount.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className={styles.orderLabel}>STATUS</span>
                        <span className={`${styles.statusBadge} ${styles[order.status.toLowerCase()]}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className={styles.orderIdBlock}>
                        <span className={styles.orderLabel}>ORDER ID #{order.id}</span>
                        <span className={styles.orderLabel}>TRACKING: {order.trackingNumber}</span>
                      </div>
                    </div>

                    <div className={styles.orderBody}>
                      {order.orderItems.map((item) => (
                        <div key={item.id} className={styles.orderItem}>
                          <img src={item.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100'} alt={item.name} className={styles.orderItemImage} />
                          <div className={styles.orderItemInfo}>
                            <Link href={`/product/${item.productId}`} className={styles.orderItemName}>
                              {item.name}
                            </Link>
                            <span className={styles.orderItemQty}>Qty: {item.quantity}</span>
                            <span className={styles.orderItemPrice}>₹{item.price.toLocaleString('en-IN')} each</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`glass-card ${styles.emptyPanel}`}>
                <h3>No orders placed yet</h3>
                <p>Browse our catalog and buy your favorite gadgets today!</p>
                <Link href="/" className="btn-primary">Shop Now</Link>
              </div>
            )}
          </div>
        )}

        {/* VIEW: Wishlist */}
        {activeTab === 'wishlist' && (
          <div className={styles.wishlistContainer}>
            <h2 className={styles.panelTitle}>Your Wishlist</h2>
            {wishlistLoading ? (
              <p>Loading wishlist items...</p>
            ) : wishlistProducts.length > 0 ? (
              <div className={styles.wishlistGrid}>
                {wishlistProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            ) : (
              <div className={`glass-card ${styles.emptyPanel}`}>
                <h3>Your Wishlist is Empty</h3>
                <p>Save products to your wishlist so you can buy them later!</p>
                <Link href="/" className="btn-primary">Browse Products</Link>
              </div>
            )}
          </div>
        )}

      </section>

    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p>Loading User Dashboard...</p>
      </div>
    }>
      <AccountDashboard />
    </Suspense>
  );
}
