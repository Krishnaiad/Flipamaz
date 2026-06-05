'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial session and state
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            // Load user cart from DB
            const cartRes = await fetch('/api/cart');
            if (cartRes.ok) {
              const cartData = await cartRes.json();
              setCart(cartData.items || []);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setIsInitialized(true);
      }
    };

    // Retrieve theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Retrieve guest cart if any
    const savedCart = localStorage.getItem('guest_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Retrieve wishlist
    const savedWishlist = localStorage.getItem('wishlist');
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist));
    }

    fetchSession();
  }, []);

  // Sync guest cart or update localStorage on change
  useEffect(() => {
    if (!user) {
      localStorage.setItem('guest_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('guest_cart');
    }
  }, [cart, user]);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Toggle Theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Auth Operations
  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      
      // Merge guest cart with database cart
      const cartRes = await fetch('/api/cart/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestCart: cart }),
      });

      if (cartRes.ok) {
        const cartData = await cartRes.json();
        setCart(cartData.items);
      }
      return { success: true };
    } else {
      const errData = await res.json();
      return { success: false, error: errData.error || 'Login failed' };
    }
  };

  const signup = async (name, email, password) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      // Auto login after signup
      return login(email, password);
    } else {
      const errData = await res.json();
      return { success: false, error: errData.error || 'Signup failed' };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setCart([]);
    localStorage.removeItem('guest_cart');
  };

  // Cart Operations
  const addToCart = async (product, quantity = 1) => {
    const existingItem = cart.find((item) => item.product.id === product.id);
    let newCart;

    if (existingItem) {
      newCart = cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newCart = [...cart, { id: Date.now(), product, quantity }];
    }

    // Optimistic Update
    setCart(newCart);

    // Backend sync if logged in
    if (user) {
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, quantity }),
        });
      } catch (err) {
        console.error('Failed to sync cart add:', err);
      }
    }
  };

  const updateCartQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    const newCart = cart.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );

    setCart(newCart);

    if (user) {
      try {
        await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, quantity }),
        });
      } catch (err) {
        console.error('Failed to sync cart update:', err);
      }
    }
  };

  const removeFromCart = async (productId) => {
    const newCart = cart.filter((item) => item.product.id !== productId);
    setCart(newCart);

    if (user) {
      try {
        await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      } catch (err) {
        console.error('Failed to sync cart delete:', err);
      }
    }
  };

  const clearCart = async () => {
    setCart([]);
    if (user) {
      try {
        await fetch('/api/cart/clear', { method: 'POST' });
      } catch (err) {
        console.error('Failed to clear db cart:', err);
      }
    }
  };

  // Wishlist Operations
  const toggleWishlist = (productId) => {
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter((id) => id !== productId));
    } else {
      setWishlist([...wishlist, productId]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        cart,
        wishlist,
        searchQuery,
        theme,
        isInitialized,
        setSearchQuery,
        toggleTheme,
        login,
        signup,
        logout,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
