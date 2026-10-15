// Reads ?id= from URL, looks it up in PRODUCTS (from main.js), and populates the page.
(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const product = PRODUCTS.find(p => p.id === id) || PRODUCTS[0];

  document.getElementById("crumb").textContent = product.name;
  document.getElementById("p-name").textContent = product.name;
  document.getElementById("p-old").textContent = product.oldPrice;
  document.getElementById("p-new").textContent = product.newPrice;
  document.title = `${product.name} — The Hyper Store`;

  // Gallery: main product image + extra gallery slots (swap media in /assets).
  const galleryImgs = [
    product.img,
    "assets/g1.svg",
    "assets/g2.svg",
    "assets/g3.svg",
  ];
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = galleryImgs.map((src, i) => `
    <div class="gimg">
      <img src="${src}" alt="${product.name} view ${i + 1}" onerror="this.style.opacity=0" />
    </div>
  `).join("");

  // Related products (everything except current)
  const related = document.getElementById("related");
  const HEART = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 21s-7.5-4.9-10-9.3C.4 8.6 1.6 5 5 5c2 0 3.2 1.1 4 2.3C9.8 6.1 11 5 13 5c3.4 0 4.6 3.6 3 6.7C19.5 16.1 12 21 12 21Z"/></svg>`;
  related.innerHTML = PRODUCTS.filter(p => p.id !== product.id).slice(0, 4).map(p => `
    <a class="card" href="product.html?id=${p.id}">
      <div class="card-media">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <button class="wish" onclick="event.preventDefault()">${HEART}</button>
        <img src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0" />
      </div>
      <div class="card-info">
        <div class="card-name">${p.name}</div>
        <div class="card-price">
          <span class="price-old">${p.oldPrice}</span>
          <span class="price-new">${p.newPrice}</span>
        </div>
      </div>
    </a>
  `).join("");

  // Swatch + size selection
  const bind = (sel) => {
    const btns = document.querySelectorAll(sel);
    btns.forEach(b => b.addEventListener("click", () => {
      btns.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    }));
  };
  bind(".swatch");
  bind(".size");

  document.querySelector(".add-cart").addEventListener("click", () => {
    alert(`Added "${product.name}" to cart`);
  });
})();
