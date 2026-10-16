// Reads ?id= from URL, looks it up in PRODUCTS (loaded from Supabase by
// js/products.js via main.js), populates the page, and wires up cart +
// reviews (backed by Supabase).
(async function () {
  await window.loadProducts();

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const product = PRODUCTS.find(p => p.id === id) || PRODUCTS[0];

  document.getElementById("crumb").textContent = product.name;
  document.getElementById("p-name").textContent = product.name;
  document.getElementById("p-old").textContent = product.oldPrice;
  document.getElementById("p-new").textContent = product.newPrice;
  document.title = `${product.name} — The Hyper Store`;
  if (product.description) {
    document.getElementById("p-desc").innerHTML = `<p>${product.description}</p>`;
  }

  const stockNote = document.getElementById("stock-note");
  const addBtn = document.querySelector(".add-cart");
  const buyBtn = document.querySelector(".buy-now");
  if (product.stock !== undefined && product.stock <= 0) {
    stockNote.textContent = "Out of stock";
    addBtn.disabled = true;
    buyBtn.disabled = true;
    addBtn.style.opacity = .5;
    buyBtn.style.opacity = .5;
  } else if (product.stock !== undefined && product.stock <= 5) {
    stockNote.textContent = `Only ${product.stock} left in stock`;
  }

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
  let selectedColor = "Black";
  let selectedSize = "S";
  const bind = (sel, onPick) => {
    const btns = document.querySelectorAll(sel);
    btns.forEach(b => b.addEventListener("click", () => {
      btns.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      if (onPick) onPick(b);
    }));
  };
  bind(".swatch", (b) => { selectedColor = b.getAttribute("aria-label") || "Default"; });
  bind(".size", (b) => { selectedSize = b.textContent.trim(); });

  function addToCart() {
    window.CART.addItem({
      product_id: product.db_id,
      name: product.name,
      price: product.price,
      img: product.img,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
    });
  }

  addBtn.addEventListener("click", () => {
    addToCart();
    alert(`Added "${product.name}" to cart`);
  });
  buyBtn.addEventListener("click", () => {
    addToCart();
    location.href = "cart.html";
  });

  // ----------------------- Reviews -----------------------
  async function loadReviews() {
    const summaryEl = document.getElementById("review-summary");
    const listEl = document.getElementById("review-list");

    if (!product.db_id || !window.sb) {
      summaryEl.innerHTML = `<span class="login-prompt">Reviews aren't available yet — connect Supabase to enable them.</span>`;
      return;
    }

    const { data: reviews, error } = await window.sb
      .from("reviews")
      .select("*")
      .eq("product_id", product.db_id)
      .order("created_at", { ascending: false });

    if (error) {
      summaryEl.innerHTML = `<span class="login-prompt">Could not load reviews.</span>`;
      return;
    }

    if (!reviews || reviews.length === 0) {
      summaryEl.innerHTML = `<span class="login-prompt">No reviews yet — be the first to review this product.</span>`;
      listEl.innerHTML = "";
    } else {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      summaryEl.innerHTML = `
        <span class="avg">${avg.toFixed(1)}</span>
        <span class="stars">${starString(Math.round(avg))}</span>
        <span class="login-prompt">(${reviews.length} review${reviews.length > 1 ? "s" : ""})</span>
      `;
      listEl.innerHTML = reviews.map(r => `
        <div class="review-item">
          <div class="r-head">
            <span class="r-author">${escapeHtml(r.author_name)}</span>
            <span class="r-date">${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <div class="stars">${starString(r.rating)}</div>
          ${r.comment ? `<div class="r-comment">${escapeHtml(r.comment)}</div>` : ""}
        </div>
      `).join("");
    }

    renderReviewForm();
  }

  function starString(n) {
    return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  async function renderReviewForm() {
    const wrap = document.getElementById("review-form-wrap");
    const user = window.AUTH ? await window.AUTH.getUser() : null;

    if (!user) {
      wrap.innerHTML = `<p class="login-prompt">Please <a href="account.html">sign in</a> to write a review.</p>`;
      return;
    }

    wrap.innerHTML = `
      <div class="review-form">
        <label style="font-size:10px;letter-spacing:1px;font-weight:700;color:var(--muted)">YOUR RATING</label>
        <div class="rating-input" id="rating-input">
          ${[1,2,3,4,5].map(n => `<span data-val="${n}">★</span>`).join("")}
        </div>
        <textarea id="review-comment" placeholder="Share your thoughts about this product..."></textarea>
        <button class="btn" id="submit-review">SUBMIT REVIEW</button>
        <div class="auth-msg" id="review-msg"></div>
      </div>
    `;

    let rating = 0;
    const stars = wrap.querySelectorAll("#rating-input span");
    stars.forEach(s => s.addEventListener("click", () => {
      rating = parseInt(s.getAttribute("data-val"), 10);
      stars.forEach(x => x.classList.toggle("active", parseInt(x.getAttribute("data-val"), 10) <= rating));
    }));

    document.getElementById("submit-review").addEventListener("click", async () => {
      const msg = document.getElementById("review-msg");
      if (rating < 1) {
        msg.textContent = "Please select a star rating.";
        msg.className = "auth-msg error show";
        return;
      }
      const comment = document.getElementById("review-comment").value.trim();
      const profile = await window.AUTH.getProfile();
      const { error } = await window.sb.from("reviews").insert({
        product_id: product.db_id,
        user_id: user.id,
        author_name: profile?.full_name || user.email,
        rating,
        comment,
      });
      if (error) {
        msg.textContent = error.message;
        msg.className = "auth-msg error show";
      } else {
        msg.textContent = "Thanks for your review!";
        msg.className = "auth-msg success show";
        loadReviews();
      }
    });
  }

  loadReviews();
})();
