'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Carousel.module.css';

export default function Carousel() {
  const [current, setCurrent] = useState(0);

  const slides = [
    {
      title: "Mega Electronics Carnival",
      subtitle: "Upgrade to MacBook Pro M3 or Dell XPS. Extra 10% HDFC card discount.",
      badge: "LIMITED PERIOD DEAL",
      link: "/search?category=laptops",
      buttonText: "Shop Laptops Now",
      gradient: "linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)"
    },
    {
      title: "Era of Galaxy AI is Here",
      subtitle: "Unleash creativity with Galaxy S24 Ultra & iPhone 15 Pro. Free shipping.",
      badge: "NEW ARRIVALS",
      link: "/search?category=mobiles",
      buttonText: "Explore Mobiles",
      gradient: "linear-gradient(135deg, #7c2d12, #9a3412, #ea580c)"
    },
    {
      title: "Make Home Smart & Cozy",
      subtitle: "Get up to 35% off LG OLED Smart TVs & Dyson Detect series vacuums.",
      badge: "BEST SELLING HOME APPLIANCES",
      link: "/search?category=appliances",
      buttonText: "Browse Appliances",
      gradient: "linear-gradient(135deg, #064e3b, #065f46, #0f766e)"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className={styles.carousel}>
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles.slide} ${index === current ? styles.active : ''}`}
          style={{ background: slide.gradient }}
        >
          <div className={`container ${styles.slideContainer}`}>
            <div className={styles.content}>
              <span className={styles.badge}>{slide.badge}</span>
              <h2 className={styles.title}>{slide.title}</h2>
              <p className={styles.subtitle}>{slide.subtitle}</p>
              <Link href={slide.link} className={styles.actionBtn}>
                {slide.buttonText} ➔
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Manual Dots indicators */}
      <div className={styles.dots}>
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`${styles.dot} ${index === current ? styles.dotActive : ''}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
