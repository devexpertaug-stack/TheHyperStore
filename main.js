// ---- Product data (edit freely; swap images in /assets) ----
const PRODUCTS = [
  {
    id: "wide-leg-black",
    name: "WIDE LEG CARGO PANTS",
    img: "assets/p1.svg",
    oldPrice: "$120",
    newPrice: "$84.00",
    badge: "SALE 30%",
  },
  {
    id: "double-knee-grey",
    name: "DOUBLE KNEE SWEATPANTS",
    img: "assets/p2.svg",
    oldPrice: "$110",
    newPrice: "$77.00",
    badge: "SALE 30%",
  },
  {
    id: "parachute-navy",
    name: "PARACHUTE TRACK PANTS",
    img: "assets/p3.svg",
    oldPrice: "$130",
    newPrice: "$91.00",
    badge: "SALE 30%",
  },
  {
    id: "pleated-cream",
    name: "PLEATED WOOL TROUSERS",
    img: "assets/p4.svg",
    oldPrice: "$140",
    newPrice: "$98.00",
    badge: "SALE 30%",
  },
  {
    id: "baggy-brown",
    name: "BAGGY CORDUROY PANTS",
    img: "assets/p5.svg",
    oldPrice: "$125",
    newPrice: "$87.00",
    badge: "SALE 30%",
  },
  {
    id: "flared-white",
    name: "FLARED DENIM JEANS",
    img: "assets/p6.svg",
    oldPrice: "$135",
    newPrice: "$94.00",
    badge: "SALE 30%",
  },
];

const HEART = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 21s-7.5-4.9-10-9.3C.4 8.6 1.6 5 5 5c2 0 3.2 1.1 4 2.3C9.8 6.1 11 5 13 5c3.4 0 4.6 3.6 3 6.7C19.5 16.1 12 21 12 21Z"/></svg>`;

function renderProducts() {
  const grid = document.getElementById("products");
  grid.innerHTML = PRODUCTS.map(p => `
    <a class="card" href="product.html?id=${p.id}">
      <div class="card-media">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <button class="wish" aria-label="Add to wishlist" onclick="event.preventDefault()">${HEART}</button>
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

renderProducts();
initFaq();
initViewToggle();
