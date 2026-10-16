// Lightweight cart stored in localStorage. Each line item:
// { product_id, name, price, img, size, color, quantity }
(function () {
  const KEY = "hyperstore_cart_v1";

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateCartBadge();
  }

  function addItem(item) {
    const items = readCart();
    const existing = items.find(
      (i) => i.product_id === item.product_id && i.size === item.size && i.color === item.color
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push(item);
    }
    writeCart(items);
  }

  function removeItem(index) {
    const items = readCart();
    items.splice(index, 1);
    writeCart(items);
  }

  function updateQuantity(index, quantity) {
    const items = readCart();
    if (items[index]) {
      items[index].quantity = Math.max(1, quantity);
      writeCart(items);
    }
  }

  function clearCart() {
    writeCart([]);
  }

  function subtotal() {
    return readCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  function count() {
    return readCart().reduce((sum, i) => sum + i.quantity, 0);
  }

  function updateCartBadge() {
    const badge = document.querySelector(".cart-count");
    if (badge) {
      const n = count();
      badge.textContent = n;
      badge.style.display = n > 0 ? "flex" : "none";
    }
  }

  window.CART = { readCart, writeCart, addItem, removeItem, updateQuantity, clearCart, subtotal, count };
  document.addEventListener("DOMContentLoaded", updateCartBadge);
})();
