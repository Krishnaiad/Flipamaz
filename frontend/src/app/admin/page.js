'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './page.module.css';

export default function AdminDashboard() {
  const { user } = useApp();
  const router = useRouter();

  // Redirect if unauthorized
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'SELLER') {
      router.push('/');
    }
  }, [user, router]);

  // Tab states: overview, orders, products
  const [activeTab, setActiveTab] = useState('overview');

  // Overview / Analytics states
  const [analytics, setAnalytics] = useState(null);
  const [salesData, setSalesData] = useState([]);
  
  // Orders states
  const [orders, setOrders] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Products states
  const [products, setProducts] = useState([]);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Product Form states
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('mobiles');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDiscount, setProdDiscount] = useState('0');
  const [prodStock, setProdStock] = useState('10');
  const [prodSpecKey1, setProdSpecKey1] = useState('Model Name');
  const [prodSpecVal1, setProdSpecVal1] = useState('');
  const [prodSpecKey2, setProdSpecKey2] = useState('Display');
  const [prodSpecVal2, setProdSpecVal2] = useState('');
  const [prodSpecKey3, setProdSpecKey3] = useState('Storage');
  const [prodSpecVal3, setProdSpecVal3] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);

  // Fetch overview data
  useEffect(() => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) return;

    const fetchOverview = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data.analytics);
          setSalesData(data.salesData);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [user]);

  // Load orders if on orders tab
  useEffect(() => {
    if (activeTab === 'orders') {
      const fetchOrders = async () => {
        try {
          const res = await fetch('/api/admin/orders');
          if (res.ok) {
            const data = await res.json();
            setOrders(data.orders || []);
          }
        } catch (err) {
          console.error('Failed to fetch admin orders:', err);
        }
      };
      fetchOrders();
    }
  }, [activeTab]);

  // Load products if on products tab
  useEffect(() => {
    if (activeTab === 'products') {
      const fetchProducts = async () => {
        try {
          const res = await fetch('/api/products');
          if (res.ok) {
            const data = await res.json();
            setProducts(data.products || []);
          }
        } catch (err) {
          console.error('Failed to fetch admin products:', err);
        }
      };
      fetchProducts();
    }
  }, [activeTab]);

  // Handle order status change
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        setOrders(
          orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        setProducts(products.filter((p) => p.id !== productId));
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  // Add Product Form submit
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!prodName || !prodBrand || !prodDesc || !prodPrice || !prodStock) {
      setErrorMsg('Please fill in all core product parameters.');
      return;
    }

    setSubmittingProduct(true);
    
    // Construct specs object
    const specs = {};
    if (prodSpecKey1 && prodSpecVal1) specs[prodSpecKey1] = prodSpecVal1;
    if (prodSpecKey2 && prodSpecVal2) specs[prodSpecKey2] = prodSpecVal2;
    if (prodSpecKey3 && prodSpecVal3) specs[prodSpecKey3] = prodSpecVal3;

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          brand: prodBrand,
          description: prodDesc,
          categorySlug: prodCategory,
          price: Number(prodPrice),
          discountPercent: Number(prodDiscount),
          stock: Number(prodStock),
          specs
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg('Product added successfully!');
        setProducts([data.product, ...products]);
        
        // Reset form
        setProdName('');
        setProdBrand('');
        setProdDesc('');
        setProdPrice('');
        setProdDiscount('0');
        setProdStock('10');
        setProdSpecVal1('');
        setProdSpecVal2('');
        setProdSpecVal3('');
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to add product.');
      }
    } catch (err) {
      console.error('Add product error:', err);
      setErrorMsg('An error occurred. Please try again.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You do not have permissions to access the Seller &amp; Admin Dashboard.</p>
      </div>
    );
  }

  return (
    <div className={`container ${styles.adminPage}`}>
      
      {/* Sidebar Controls */}
      <aside className={`glass-card ${styles.sidebar}`}>
        <h2 className={styles.sidebarTitle}>Seller Console</h2>
        <nav className={styles.sidebarNav}>
          <button 
            onClick={() => setActiveTab('overview')}
            className={`${styles.navItem} ${activeTab === 'overview' ? styles.activeNavItem : ''}`}
          >
            Dashboard Overview
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`${styles.navItem} ${activeTab === 'orders' ? styles.activeNavItem : ''}`}
          >
            Manage Orders
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`${styles.navItem} ${activeTab === 'products' ? styles.activeNavItem : ''}`}
          >
            Manage Inventory
          </button>
        </nav>
      </aside>

      {/* Main Panel Content */}
      <section className={styles.mainContent}>
        
        {/* VIEW 1: Overview / Analytics Dashboard */}
        {activeTab === 'overview' && (
          <div className={styles.overviewContainer}>
            <h1 className={styles.panelTitle}>Performance Dashboard</h1>
            
            {loading ? (
              <p>Loading analytics...</p>
            ) : analytics ? (
              <div className={styles.overviewGrid}>
                {/* KPI Metrics */}
                <div className={styles.kpiGrid}>
                  <div className={`glass-card ${styles.kpiCard}`}>
                    <span className={styles.kpiLabel}>Total Revenue</span>
                    <strong className={styles.kpiValue}>₹{analytics.totalSales.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className={`glass-card ${styles.kpiCard}`}>
                    <span className={styles.kpiLabel}>Orders Placed</span>
                    <strong className={styles.kpiValue}>{analytics.totalOrders}</strong>
                  </div>
                  <div className={`glass-card ${styles.kpiCard}`}>
                    <span className={styles.kpiLabel}>Products in Catalog</span>
                    <strong className={styles.kpiValue}>{analytics.totalProducts}</strong>
                  </div>
                  <div className={`glass-card ${styles.kpiCard}`}>
                    <span className={styles.kpiLabel}>Out-of-Stock Items</span>
                    <strong className={`${styles.kpiValue} ${analytics.outOfStockProducts > 0 ? styles.alertValue : ''}`}>
                      {analytics.outOfStockProducts}
                    </strong>
                  </div>
                </div>

                {/* Sales Chart (CSS drawn representation) */}
                <div className={`glass-card ${styles.chartCard}`}>
                  <h3>Sales Distribution (Weekly Revenue)</h3>
                  <div className={styles.chartArea}>
                    {salesData.map((data, idx) => {
                      const maxSales = Math.max(...salesData.map(s => s.sales)) || 1;
                      const pctHeight = (data.sales / maxSales) * 100;
                      return (
                        <div key={idx} className={styles.chartCol}>
                          <div className={styles.chartBarWrapper}>
                            <span className={styles.chartBarValue}>₹{data.sales.toLocaleString('en-IN')}</span>
                            <div 
                              className={styles.chartBar} 
                              style={{ height: `${pctHeight}%` }}
                            />
                          </div>
                          <span className={styles.chartBarLabel}>{data.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p>Failed to load dashboard data.</p>
            )}
          </div>
        )}

        {/* VIEW 2: Manage Orders Panel */}
        {activeTab === 'orders' && (
          <div className={`glass-card ${styles.panelCard}`}>
            <h1 className={styles.panelTitle}>Manage Orders</h1>
            <hr className={styles.divider} />
            
            {orders.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total Billing</th>
                      <th>Status Tracking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.id}</strong><br />
                          <span className={styles.subText}>{new Date(order.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td>
                          <strong>{order.user.name}</strong><br />
                          <span className={styles.subText}>{order.user.email}</span>
                        </td>
                        <td>
                          <div className={styles.orderItemsPreview}>
                            {order.orderItems.map((item) => (
                              <div key={item.id} className={styles.previewItem}>
                                • {item.name} (x{item.quantity})
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong>₹{order.totalAmount.toLocaleString('en-IN')}</strong><br />
                          <span className={styles.subText}>{order.paymentMethod}</span>
                        </td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={updatingOrderId === order.id}
                            className={`${styles.tableSelect} ${styles[order.status.toLowerCase() + 'Select']}`}
                          >
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No orders recorded in database yet.</p>
            )}
          </div>
        )}

        {/* VIEW 3: Manage Products / Inventory */}
        {activeTab === 'products' && (
          <div className={styles.productsContainer}>
            
            {/* Add product Form */}
            <div className={`glass-card ${styles.panelCard}`}>
              <h2 className={styles.panelTitle}>Add New Product to Catalog</h2>
              <hr className={styles.divider} />

              {successMsg && <div className={styles.successBanner}>{successMsg}</div>}
              {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

              <form onSubmit={handleAddProduct} className={styles.productForm}>
                <div className={styles.formGrid}>
                  <div className={styles.formRow}>
                    <label htmlFor="prod-name">Product Name:</label>
                    <input
                      id="prod-name"
                      type="text"
                      placeholder="e.g. OnePlus 12 (5G, 256GB)"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label htmlFor="prod-brand">Brand:</label>
                    <input
                      id="prod-brand"
                      type="text"
                      placeholder="e.g. OnePlus"
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      className={styles.formInput}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <label htmlFor="prod-desc">Product Description:</label>
                  <textarea
                    id="prod-desc"
                    rows="3"
                    placeholder="Provide a detailed product description..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className={styles.formInput}
                    required
                  />
                </div>

                <div className={styles.formGrid3}>
                  <div className={styles.formRow}>
                    <label htmlFor="prod-category">Category:</label>
                    <select
                      id="prod-category"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className={styles.formInput}
                    >
                      <option value="mobiles">Mobiles</option>
                      <option value="laptops">Laptops</option>
                      <option value="audio">Audio</option>
                      <option value="wearables">Wearables</option>
                      <option value="appliances">Appliances</option>
                    </select>
                  </div>
                  <div className={styles.formRow}>
                    <label htmlFor="prod-price">Price (₹):</label>
                    <input
                      id="prod-price"
                      type="number"
                      placeholder="64999"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.formRow}>
                      <label htmlFor="prod-discount">Discount %:</label>
                      <input
                        id="prod-discount"
                        type="number"
                        placeholder="10"
                        value={prodDiscount}
                        onChange={(e) => setProdDiscount(e.target.value)}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formRow}>
                      <label htmlFor="prod-stock">Stock:</label>
                      <input
                        id="prod-stock"
                        type="number"
                        placeholder="15"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className={styles.formInput}
                        required
                      />
                    </div>
                  </div>
                </div>

                <h3 className={styles.formSubTitle}>Product Specifications</h3>
                <div className={styles.formGrid3}>
                  <div className={styles.formRow}>
                    <label htmlFor="spec-val-1">Model Name:</label>
                    <input
                      id="spec-val-1"
                      type="text"
                      placeholder="OnePlus 12"
                      value={prodSpecVal1}
                      onChange={(e) => setProdSpecVal1(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label htmlFor="spec-val-2">Display:</label>
                    <input
                      id="spec-val-2"
                      type="text"
                      placeholder="6.82 inch 120Hz ProXDR"
                      value={prodSpecVal2}
                      onChange={(e) => setProdSpecVal2(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label htmlFor="spec-val-3">Storage:</label>
                    <input
                      id="spec-val-3"
                      type="text"
                      placeholder="256 GB"
                      value={prodSpecVal3}
                      onChange={(e) => setProdSpecVal3(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submittingProduct} 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                >
                  {submittingProduct ? 'Adding Product...' : 'Add Product'}
                </button>
              </form>
            </div>

            {/* Inventory table */}
            <div className={`glass-card ${styles.panelCard}`}>
              <h2 className={styles.panelTitle}>Active Inventory Catalog</h2>
              <hr className={styles.divider} />
              
              <div className={styles.tableWrapper}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Brand</th>
                      <th>Price</th>
                      <th>Stock Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((prod) => (
                      <tr key={prod.id}>
                        <td>
                          <strong>{prod.name}</strong><br />
                          <span className={styles.subText}>ID #{prod.id}</span>
                        </td>
                        <td>{prod.brand}</td>
                        <td>₹{prod.price.toLocaleString('en-IN')} ({prod.discountPercent}% Off)</td>
                        <td>
                          <span className={`${styles.stockBadge} ${prod.stock === 0 ? styles.oos : prod.stock <= 5 ? styles.low : styles.ok}`}>
                            {prod.stock === 0 ? 'Out of Stock' : prod.stock <= 5 ? `Low Stock (${prod.stock})` : `In Stock (${prod.stock})`}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className={styles.deleteBtn}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </section>

    </div>
  );
}
