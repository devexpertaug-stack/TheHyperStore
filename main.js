// ---- Product rendering (data now comes from Supabase via js/products.js;
//      window.PRODUCTS is populated by loadProducts(), with a local
//      fallback if Supabase isn't configured yet) ----

const HEART = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 21s-7.5-4.9-10-9.3C.4 8.6 1.6 5 5 5c2 0 3.2 1.1 4 2.3C9.8 6.1 11 5 13 5c3.4 0 4.6 3.6 3 6.7C19.5 16.1 12 21 12 21Z"/></svg>`;

function renderProducts() {
  const grid = document.getElementById("products");
  if (!grid) return;
  grid.innerHTML = PRODUCTS.map(p => `
    <a class="card" href="product.html?id=${p.id}">
      <div class="card-media">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        ${p.stock === 0 ? `<span class="badge" style="background:#555;left:auto;right:10px">SOLD OUT</span>` : ""}
        <button class="wish" aria-label="Add to wishlist" onclick="event.preventDefault()">${HEART}</button>
        <img src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0" />
      </div>
      <div class="card-info">
        <div class="card-name">${p.name}</div>
        <div class="card-price">
          ${p.oldPrice ? `<span class="price-old">${p.oldPrice}</span>` : ""}
          <span class="price-new">${p.newPrice}</span>
        </div>
      </div>
    </a>
  `).join("");
}

// ---- FAQ accordion ----
function initFaq() {
  document.querySelectorAll(".faq-item").forEach(item => {
    item.querySelector(".faq-q").addEventListener("click", () => {
      item.classList.toggle("open");
    });
  });
}

// ---- View toggle (visual only) ----
function initViewToggle() {
  const btns = document.querySelectorAll(".view-btn");
  btns.forEach(b => b.addEventListener("click", () => {
    btns.forEach(x => x.classList.remove("active"));
    b.classList.add("active");
  }));
}

(async function init() {
  await window.loadProducts();
  renderProducts();
  initFaq();
  initViewToggle();
})();
