'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './page.module.css';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search parameters from URL
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const initialBrand = searchParams.get('brand') || '';
  const initialRating = searchParams.get('rating') || '';
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialSort = searchParams.get('sort') || 'popular';

  // Local filter states
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedRating, setSelectedRating] = useState(initialRating);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [sort, setSort] = useState(initialSort);
  const [loading, setLoading] = useState(true);

  // Sync state with URL change
  useEffect(() => {
    setSelectedBrand(searchParams.get('brand') || '');
    setSelectedRating(searchParams.get('rating') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setSort(searchParams.get('sort') || 'popular');
  }, [searchParams]);

  // Fetch filtered products
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true);
      try {
        let url = `/api/products?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&sort=${sort}`;
        
        if (selectedBrand) url += `&brand=${encodeURIComponent(selectedBrand)}`;
        if (selectedRating) url += `&rating=${selectedRating}`;
        if (minPrice) url += `&minPrice=${minPrice}`;
        if (maxPrice) url += `&maxPrice=${maxPrice}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setBrands(data.brands || []);
        }
      } catch (err) {
        console.error('Failed to fetch filtered products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredProducts();
  }, [query, category, selectedBrand, selectedRating, sort, minPrice, maxPrice]);

  // Update URL search parameters
  const updateUrl = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  };

  const handlePriceApply = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');
    
    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');

    router.push(`/search?${params.toString()}`);
  };

  const handleClearAll = () => {
    setSelectedBrand('');
    setSelectedRating('');
    setMinPrice('');
    setMaxPrice('');
    setSort('popular');
    router.push(`/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);
  };

  return (
    <div className={`container ${styles.searchPage}`}>
      
      {/* Sidebar Filters */}
      <aside className={`glass-card ${styles.sidebar}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Filters</h2>
          <button onClick={handleClearAll} className={styles.clearBtn}>
            Clear All
          </button>
        </div>

        {/* Categories helper (if search results category exists) */}
        {category && (
          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Active Category</h3>
            <div className={styles.activeCategory}>
              <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
              <button 
                onClick={() => updateUrl('category', '')}
                className={styles.removeFilterBtn}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Price Range Filter */}
        <div className={styles.filterGroup}>
          <h3 className={styles.filterTitle}>Price Range (₹)</h3>
          <form onSubmit={handlePriceApply} className={styles.priceFilterForm}>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className={styles.priceInput}
            />
            <span className={styles.priceDelimiter}>to</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className={styles.priceInput}
            />
            <button type="submit" className={styles.priceGoBtn}>
              Go
            </button>
          </form>
        </div>

        {/* Brand Filter */}
        {brands.length > 0 && (
          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Brands</h3>
            <div className={styles.checkboxList}>
              {brands.map((brandName) => (
                <label key={brandName} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedBrand === brandName}
                    onChange={(e) => {
                      const val = e.target.checked ? brandName : '';
                      setSelectedBrand(val);
                      updateUrl('brand', val);
                    }}
                    className={styles.checkboxInput}
                  />
                  <span>{brandName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Customer Rating Filter */}
        <div className={styles.filterGroup}>
          <h3 className={styles.filterTitle}>Customer Rating</h3>
          <div className={styles.ratingFilters}>
            {[4, 3, 2].map((stars) => (
              <button
                key={stars}
                onClick={() => {
                  const val = selectedRating === stars.toString() ? '' : stars.toString();
                  setSelectedRating(val);
                  updateUrl('rating', val);
                }}
                className={`${styles.ratingFilterBtn} ${selectedRating === stars.toString() ? styles.activeRatingFilter : ''}`}
              >
                <span className={styles.starsRow}>
                  {Array(stars).fill(0).map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" color="#ff9900"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  ))}
                  {Array(5 - stars).fill(0).map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="#ff9900"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  ))}
                </span>
                <span className={styles.ratingText}>& Up</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Results Grid */}
      <section className={styles.mainContent}>
        
        {/* Results Header (Amazon-style summaries + Sorting) */}
        <div className={styles.resultsHeader}>
          <div className={styles.resultsSummary}>
            {loading ? (
              <span>Searching...</span>
            ) : (
              <span>
                Showing {products.length} {products.length === 1 ? 'result' : 'results'} 
                {query && <> for &quot;<strong>{query}</strong>&quot;</>}
              </span>
            )}
          </div>

          <div className={styles.sortingBlock}>
            <label htmlFor="sort-select" className={styles.sortLabel}>Sort By:</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                updateUrl('sort', e.target.value);
              }}
              className={styles.sortSelect}
            >
              <option value="popular">Popularity / Best Seller</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
              <option value="rating">Customer Review Rating</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className={styles.loaderWrapper}>
            <div className={styles.spinner}></div>
            <p>Loading FlipAmaz deals...</p>
          </div>
        ) : products.length > 0 ? (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={`glass-card ${styles.emptyState}`}>
            <span className={styles.emptyIcon}>🔍</span>
            <h3>No results found</h3>
            <p>We couldn&apos;t find any products matching your active filters. Try resetting your search parameters.</p>
            <button onClick={handleClearAll} className="btn-primary">
              Clear All Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p>Loading Catalog...</p>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
