'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import StarRating from '@/components/StarRating/StarRating';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './page.module.css';

export default function ProductDetailsClient({ product, similarProducts }) {
  const { cart, wishlist, toggleWishlist, addToCart, user } = useApp();
  const router = useRouter();

  // Parsing JSON fields safely
  const images = JSON.parse(product.images);
  const specs = JSON.parse(product.specifications);

  // States
  const [activeImage, setActiveImage] = useState(images[0] || '');
  const [selectedStorage, setSelectedStorage] = useState(specs['Storage'] || specs['Unified Memory'] || '');
  const [selectedColor, setSelectedColor] = useState('Default');
  const [activeTab, setActiveTab] = useState('specs'); // specs, reviews, qa

  // Review states
  const [reviewsList, setReviewsList] = useState(product.reviews || []);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Q&A states
  const [qaList, setQaList] = useState(product.questionAnswers || []);
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const discountedPrice = Math.round(product.price * (1 - product.discountPercent / 100));
  const hasDiscount = product.discountPercent > 0;
  const isWishlisted = wishlist.includes(product.id);

  const handleAddToCart = () => {
    addToCart(product, 1);
  };

  const handleBuyNow = () => {
    addToCart(product, 1);
    router.push('/cart');
  };

  // Submit Review Handler
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/account?tab=login');
      return;
    }
    if (!newReviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: newReviewRating,
          title: newReviewTitle,
          comment: newReviewComment
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Add new review dynamically to top of list
        setReviewsList([data.review, ...reviewsList]);
        setNewReviewTitle('');
        setNewReviewComment('');
        setNewReviewRating(5);
      }
    } catch (err) {
      console.error('Submit review error:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Submit Question Handler
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/account?tab=login');
      return;
    }
    if (!newQuestion.trim()) return;

    setSubmittingQuestion(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          question: newQuestion
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQaList([data.questionAnswer, ...qaList]);
        setNewQuestion('');
      }
    } catch (err) {
      console.error('Submit question error:', err);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  return (
    <div className={`container ${styles.productPage}`}>
      
      {/* Category Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <span>Home</span> &gt; <span>{product.category.name}</span> &gt; <span className={styles.activeCrumb}>{product.brand}</span>
      </div>

      {/* Product Display Details grid */}
      <div className={styles.mainGrid}>
        
        {/* Left Side: Product Gallery & Purchase Buttons */}
        <div className={styles.galleryCol}>
          <div className={styles.galleryCard}>
            <div className={styles.imageSelector}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`${styles.thumbBtn} ${activeImage === img ? styles.activeThumb : ''}`}
                >
                  <img src={img} alt={`thumbnail-${idx}`} />
                </button>
              ))}
            </div>

            <div className={styles.largeImageWrapper}>
              <img src={activeImage} alt={product.name} className={styles.largeImage} />
              
              {/* Wishlist Heart overlay */}
              <button 
                onClick={() => toggleWishlist(product.id)} 
                className={`${styles.wishlistBtn} ${isWishlisted ? styles.wishlisted : ''}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Flipkart-Style Orange and Yellow Buy Buttons */}
          <div className={styles.purchaseActions}>
            <button onClick={handleAddToCart} className={styles.addToCartBtn}>
              Add to Cart
            </button>
            <button onClick={handleBuyNow} className={styles.buyNowBtn}>
              Buy Now
            </button>
          </div>
        </div>

        {/* Right Side: Specifications and descriptions */}
        <div className={styles.infoCol}>
          
          <div className={styles.brandRow}>
            <span className={styles.brandText}>{product.brand}</span>
            <span className={styles.assuredTag}>FlipAmaz Assured ✔</span>
          </div>

          <h1 className={styles.productTitle}>{product.name}</h1>

          {/* Ratings summaries */}
          <div className={styles.ratingRow}>
            <div className={styles.ratingBadge}>
              {product.ratingAverage} ★
            </div>
            <StarRating rating={product.ratingAverage} size={16} />
            <span className={styles.ratingMeta}>
              {reviewsList.length} Ratings &amp; {reviewsList.filter(r => r.comment).length} Reviews
            </span>
          </div>

          {/* Price comparisons */}
          <div className={styles.pricingBlock}>
            <div className={styles.priceRow}>
              <span className={styles.priceText}>₹{discountedPrice.toLocaleString('en-IN')}</span>
              {hasDiscount && (
                <>
                  <span className={styles.originalPriceText}>₹{product.price.toLocaleString('en-IN')}</span>
                  <span className={styles.discountPercentText}>{product.discountPercent}% off</span>
                </>
              )}
            </div>
            <p className={styles.taxLabel}>Inclusive of all taxes</p>
            {product.stock <= 5 && product.stock > 0 && (
              <span className={styles.stockWarning}>Hurry, only {product.stock} items left in stock!</span>
            )}
            {product.stock === 0 && (
              <span className={styles.outOfStock}>Out of stock</span>
            )}
          </div>

          {/* Seller details */}
          <div className={styles.sellerSection}>
            <span className={styles.sellerTitle}>Seller:</span>
            <span className={styles.sellerName}>{product.seller.name}</span>
            <p className={styles.sellerWarranty}>1 Year Brand Warranty available</p>
          </div>

          {/* Variants selections (if any) */}
          {(specs['Storage'] || specs['Unified Memory']) && (
            <div className={styles.variantsSection}>
              <span className={styles.sectionHeading}>Storage Options:</span>
              <div className={styles.variantChips}>
                <button className={`${styles.variantChip} ${styles.activeChip}`}>
                  {specs['Storage'] || specs['Unified Memory']}
                </button>
                <button className={styles.variantChip} disabled>
                  {specs['Storage'] ? '512 GB' : '16 GB'} (OOS)
                </button>
              </div>
            </div>
          )}

          {/* Features description */}
          <div className={styles.descriptionSection}>
            <span className={styles.sectionHeading}>Product Description:</span>
            <p className={styles.descriptionText}>{product.description}</p>
          </div>

          {/* Tabs Details Selector (Specs, Reviews, Q&A) */}
          <div className={styles.detailsTabs}>
            <div className={styles.tabsHeader}>
              <button 
                onClick={() => setActiveTab('specs')}
                className={`${styles.tabBtn} ${activeTab === 'specs' ? styles.activeTab : ''}`}
              >
                Specifications
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`${styles.tabBtn} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
              >
                Reviews ({reviewsList.length})
              </button>
              <button 
                onClick={() => setActiveTab('qa')}
                className={`${styles.tabBtn} ${activeTab === 'qa' ? styles.activeTab : ''}`}
              >
                Q&amp;A ({qaList.length})
              </button>
            </div>

            {/* TAB CONTENT: Specifications */}
            {activeTab === 'specs' && (
              <div className={styles.tabContent}>
                <table className={styles.specsTable}>
                  <tbody>
                    {Object.entries(specs).map(([key, val]) => (
                      <tr key={key}>
                        <td className={styles.specKey}>{key}</td>
                        <td className={styles.specVal}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: Reviews */}
            {activeTab === 'reviews' && (
              <div className={styles.tabContent}>
                
                {/* Submit review Form */}
                <div className={`glass-card ${styles.formCard}`}>
                  <h4>Write a Customer Review</h4>
                  {user ? (
                    <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
                      <div className={styles.formRow}>
                        <label>Rating:</label>
                        <select 
                          value={newReviewRating} 
                          onChange={(e) => setNewReviewRating(Number(e.target.value))}
                          className={styles.formSelect}
                        >
                          <option value="5">5 ★★★★★ (Excellent)</option>
                          <option value="4">4 ★★★★☆ (Good)</option>
                          <option value="3">3 ★★★☆☆ (Average)</option>
                          <option value="2">2 ★★☆☆☆ (Poor)</option>
                          <option value="1">1 ★☆☆☆☆ (Terrible)</option>
                        </select>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="review-title">Title:</label>
                        <input
                          id="review-title"
                          type="text"
                          placeholder="Summarize your review in a title..."
                          value={newReviewTitle}
                          onChange={(e) => setNewReviewTitle(e.target.value)}
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="review-comment">Comment:</label>
                        <textarea
                          id="review-comment"
                          rows="3"
                          placeholder="Share your detailed feedback..."
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                          className={styles.formTextarea}
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={submittingReview}
                        className="btn-primary"
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  ) : (
                    <p className={styles.loginRequired}>
                      Please <span onClick={() => router.push('/account?tab=login')} className={styles.loginLinkInline}>login</span> to submit a product review.
                    </p>
                  )}
                </div>

                {/* Reviews List */}
                <div className={styles.reviewsList}>
                  {reviewsList.length > 0 ? (
                    reviewsList.map((rev) => (
                      <div key={rev.id} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <span className={styles.reviewRatingBadge}>{rev.rating} ★</span>
                          <strong className={styles.reviewTitleText}>{rev.title || 'Verified Purchase'}</strong>
                        </div>
                        <p className={styles.reviewCommentText}>{rev.comment}</p>
                        <div className={styles.reviewFooter}>
                          <span>By {rev.user?.name || 'Anonymous'}</span>
                          <span>•</span>
                          <span>{new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No reviews yet for this product. Be the first to review!</p>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: Q&As */}
            {activeTab === 'qa' && (
              <div className={styles.tabContent}>
                
                {/* Submit Question Form */}
                <div className={`glass-card ${styles.formCard}`}>
                  <h4>Ask a Question about this Product</h4>
                  {user ? (
                    <form onSubmit={handleQuestionSubmit} className={styles.qaForm}>
                      <input
                        type="text"
                        placeholder="e.g. Does this support USB OTG functionality?"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className={styles.formInput}
                        required
                      />
                      <button 
                        type="submit" 
                        disabled={submittingQuestion} 
                        className="btn-primary"
                      >
                        {submittingQuestion ? 'Asking...' : 'Ask Question'}
                      </button>
                    </form>
                  ) : (
                    <p className={styles.loginRequired}>
                      Please <span onClick={() => router.push('/account?tab=login')} className={styles.loginLinkInline}>login</span> to ask questions.
                    </p>
                  )}
                </div>

                {/* Q&A List */}
                <div className={styles.qaList}>
                  {qaList.length > 0 ? (
                    qaList.map((qa) => (
                      <div key={qa.id} className={styles.qaItem}>
                        <div className={styles.questionRow}>
                          <span className={styles.qaLabel}>Q:</span>
                          <span className={styles.qaText}><strong>{qa.question}</strong></span>
                        </div>
                        <div className={styles.answerRow}>
                          <span className={styles.qaLabel}>A:</span>
                          <span className={styles.qaText}>
                            {qa.answer ? (
                              <>
                                <span>{qa.answer}</span>
                                <span className={styles.answerMeta}>
                                  Answered by {qa.seller?.name || 'Seller'} • {new Date(qa.createdAt).toLocaleDateString()}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontStyle: 'italic', color: 'var(--foreground-light)' }}>
                                Awaiting response from the seller.
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No questions asked yet. Have any questions? Ask above!</p>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* Similar products catalog row */}
      {similarProducts.length > 0 && (
        <section className={styles.similarProducts}>
          <h2 className={styles.similarTitle}>Similar Products You May Like</h2>
          <div className={styles.similarGrid}>
            {similarProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
