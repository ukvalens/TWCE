import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

const STORAGE_KEY = 'twce_guest_cart';

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((product, qty = 1) => {
    setCart(prev => {
      const exists = prev.find(i => i.product_id === product.product_id);
      if (exists) return prev.map(i => i.product_id === product.product_id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
  }, []);

  const changeQty = useCallback((product_id, delta) => {
    setCart(prev =>
      prev.map(i => i.product_id === product_id ? { ...i, qty: i.qty + delta } : i)
          .filter(i => i.qty > 0)
    );
  }, []);

  const removeFromCart = useCallback((product_id) => {
    setCart(prev => prev.filter(i => i.product_id !== product_id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + parseFloat(i.discount_price || i.price) * i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, addToCart, changeQty, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
