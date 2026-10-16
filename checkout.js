(function () {
  async function init() {
    const user = await window.AUTH.getUser();
    const items = window.CART.readCart();

    if (!user) {
      document.getElementById("not-logged-in").style.display = "block";
      return;
    }
    if (items.length === 0) {
      document.getElementById("checkout-form-wrap").innerHTML = `<p class="login-prompt">Your cart is empty. <a href="index.html">Continue shopping</a>.</p>`;
      document.getElementById("checkout-form-wrap").style.display = "block";
      return;
    }

    document.getElementById("checkout-form-wrap").style.display = "block";
    document.getElementById("order-summary").innerHTML = `
      ${items.map(i => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;">
        <span>${i.quantity}× ${i.name} (${i.size}, ${i.color})</span>
        <span>$${(i.price * i.quantity).toFixed(2)}</span>
      </div>`).join("")}
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:10px;padding-top:10px;border-top:1px solid var(--line);">
        <span>Total</span><span>$${window.CART.subtotal().toFixed(2)}</span>
      </div>
    `;

    document.getElementById("checkout-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("checkout-msg");
      const payloadItems = items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        size: i.size,
        color: i.color,
      }));

      const { data, error } = await window.sb.rpc("create_order", {
        items: payloadItems,
        shipping_name: document.getElementById("ship-name").value.trim(),
        shipping_phone: document.getElementById("ship-phone").value.trim(),
        shipping_address: document.getElementById("ship-address").value.trim(),
        shipping_city: document.getElementById("ship-city").value.trim(),
        shipping_postal: document.getElementById("ship-postal").value.trim(),
        shipping_country: document.getElementById("ship-country").value.trim(),
      });

      if (error) {
        msg.textContent = error.message;
        msg.className = "auth-msg error show";
      } else {
        window.CART.clearCart();
        msg.textContent = "Order placed! Redirecting to your account...";
        msg.className = "auth-msg success show";
        setTimeout(() => (location.href = "account.html"), 1500);
      }
    });
  }

  init();
})();
