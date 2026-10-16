(function () {
  function render() {
    const items = window.CART.readCart();
    const container = document.getElementById("cart-items");
    const summary = document.getElementById("cart-summary");

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">Your cart is empty. <a href="index.html">Continue shopping</a>.</div>`;
      summary.style.display = "none";
      return;
    }

    container.innerHTML = items.map((item, i) => `
      <div class="cart-row">
        <img src="${item.img}" alt="${item.name}" onerror="this.style.opacity=0" />
        <div>
          <div style="font-weight:600;font-size:12px;margin-bottom:4px;">${item.name}</div>
          <div style="font-size:11px;color:var(--muted);">Size: ${item.size || "-"} · Color: ${item.color || "-"}</div>
          <div style="font-size:12px;margin-top:6px;">$${item.price.toFixed(2)}</div>
        </div>
        <div class="cart-qty">
          <button data-dec="${i}">−</button>
          <span>${item.quantity}</span>
          <button data-inc="${i}">+</button>
        </div>
        <button class="icon-link-btn danger" data-remove="${i}">Remove</button>
      </div>
    `).join("");

    summary.style.display = "block";
    document.getElementById("cart-subtotal").textContent = `$${window.CART.subtotal().toFixed(2)}`;

    container.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.getAttribute("data-inc"), 10);
      const items = window.CART.readCart();
      window.CART.updateQuantity(i, items[i].quantity + 1);
      render();
    }));
    container.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.getAttribute("data-dec"), 10);
      const items = window.CART.readCart();
      window.CART.updateQuantity(i, items[i].quantity - 1);
      render();
    }));
    container.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => {
      window.CART.removeItem(parseInt(b.getAttribute("data-remove"), 10));
      render();
    }));
  }

  render();
})();
