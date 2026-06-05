import React from 'react';

export default function StarRating({ rating, size = 16 }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.3 && rating % 1 < 0.8;
  const fullHalf = rating % 1 >= 0.8; // round up to full star if >= 0.8
  
  const finalFull = fullStars + (fullHalf ? 1 : 0);
  const finalHalf = hasHalf ? 1 : 0;
  const emptyStars = Math.max(0, 5 - finalFull - finalHalf);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#ff9900' }}>
      {/* Full Stars */}
      {Array(finalFull).fill(0).map((_, i) => (
        <svg key={`full-${i}`} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ))}
      
      {/* Half Star */}
      {finalHalf > 0 && (
        <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <defs>
            <linearGradient id="half-star-grad">
              <stop offset="50%" stopColor="#ff9900" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <polygon fill="url(#half-star-grad)" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      )}
      
      {/* Empty Stars */}
      {Array(emptyStars).fill(0).map((_, i) => (
        <svg key={`empty-${i}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ))}
    </div>
  );
}
