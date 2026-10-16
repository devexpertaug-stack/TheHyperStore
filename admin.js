(function () {
  const loginGate = document.getElementById("admin-login-gate");
  const forbidden = document.getElementById("admin-forbidden");
  const dashboard = document.getElementById("admin-dashboard");
  const signoutBtn = document.getElementById("admin-signout");

  // ---------------- Auth gate ----------------
  document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("admin-login-msg");
    try {
      await window.AUTH.signIn(
        document.getElementById("admin-email").value.trim(),
        document.getElementById("admin-password").value
      );
      location.reload();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "auth-msg error show";
    }
  });

  signoutBtn.addEventListener("click", async () => {
    await window.AUTH.signOut();
    location.reload();
  });

  async function gate() {
    const user = await window.AUTH.getUser();
    if (!user) {
      loginGate.style.display = "block";
      return false;
    }
    const profile = await window.AUTH.getProfile();
    if (!profile || profile.role !== "admin") {
      forbidden.style.display = "block";
      signoutBtn.style.display = "inline-block";
      return false;
    }
    dashboard.style.display = "block";
    signoutBtn.style.display = "inline-block";
    return true;
  }

  // ---------------- Tabs ----------------
  function initTabs() {
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(t => t.addEventListener("click", () => {
      tabs.forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
      t.classList.add("active");
      document.getElementById(`tab-${t.getAttribute("data-tab")}`).classList.add("active");
    }));
  }

  // ---------------- Insights ----------------
  async function loadInsights() {
    const { data: orders } = await window.sb.from("orders").select("*, order_items(*)");
    const { data: products } = await window.sb.from("products").select("*");

    const allOrders = orders || [];
    const revenue = allOrders.reduce((s, o) => s + Number(o.subtotal), 0);
    const customers = new Set(allOrders.map(o => o.user_id)).size;
    const lowStock = (products || []).filter(p => p.stock <= 5).length;

    document.getElementById("stat-revenue").textContent = `$${revenue.toFixed(2)}`;
    document.getElementById("stat-orders").textContent = allOrders.length;
    document.getElementById("stat-customers").textContent = customers;
    document.getElementById("stat-lowstock").textContent = lowStock;

    // top products by units sold
    const salesMap = {};
    allOrders.forEach(o => (o.order_items || []).forEach(i => {
      if (!salesMap[i.product_name]) salesMap[i.product_name] = { units: 0, revenue: 0 };
      salesMap[i.product_name].units += i.quantity;
      salesMap[i.product_name].revenue += Number(i.unit_price) * i.quantity;
    }));
    const topRows = Object.entries(salesMap)
      .sort((a, b) => b[1].units - a[1].units)
      .slice(0, 5);
    document.querySelector("#top-products-table tbody").innerHTML = topRows.length
      ? topRows.map(([name, v]) => `<tr><td>${name}</td><td>${v.units}</td><td>$${v.revenue.toFixed(2)}</td></tr>`).join("")
      : `<tr><td colspan="3" style="color:var(--muted)">No sales yet.</td></tr>`;

    // recent orders
    const recent = [...allOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
    const emailMap = await getUserEmails(recent.map(o => o.user_id));
    document.querySelector("#recent-orders-table tbody").innerHTML = recent.length
      ? recent.map(o => `
        <tr>
          <td>#${o.id.slice(0, 8)}</td>
          <td>${emailMap[o.user_id] || o.user_id.slice(0, 8)}</td>
          <td>${new Date(o.created_at).toLocaleDateString()}</td>
          <td><span class="status-pill status-${o.status}">${o.status}</span></td>
          <td>$${Number(o.subtotal).toFixed(2)}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="5" style="color:var(--muted)">No orders yet.</td></tr>`;
  }

  // Best-effort email lookup via profiles table (no admin API needed client-side)
  async function getUserEmails(userIds) {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return {};
    const { data } = await window.sb.from("profiles").select("id, email").in("id", ids);
    const map = {};
    (data || []).forEach(p => (map[p.id] = p.email));
    return map;
  }

  // ---------------- Products & Inventory ----------------
  let editingId = null;

  function resetProductForm() {
    editingId = null;
    document.getElementById("product-form").reset();
    document.getElementById("pf-active").checked = true;
    document.getElementById("product-form-title").textContent = "ADD PRODUCT";
  }

  document.getElementById("new-product-btn").addEventListener("click", () => {
    resetProductForm();
    document.getElementById("product-form-wrap").style.display = "block";
  });
  document.getElementById("cancel-product-form").addEventListener("click", () => {
    document.getElementById("product-form-wrap").style.display = "none";
  });

  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("product-form-msg");
    const payload = {
      name: document.getElementById("pf-name").value.trim(),
      slug: document.getElementById("pf-slug").value.trim(),
      description: document.getElementById("pf-description").value.trim(),
      price: parseFloat(document.getElementById("pf-price").value),
      old_price: document.getElementById("pf-oldprice").value ? parseFloat(document.getElementById("pf-oldprice").value) : null,
      stock: parseInt(document.getElementById("pf-stock").value, 10),
      category: document.getElementById("pf-category").value.trim(),
      badge: document.getElementById("pf-badge").value.trim(),
      image_url: document.getElementById("pf-image").value.trim(),
      active: document.getElementById("pf-active").checked,
    };

    let error;
    if (editingId) {
      ({ error } = await window.sb.from("products").update(payload).eq("id", editingId));
    } else {
      ({ error } = await window.sb.from("products").insert(payload));
    }

    if (error) {
      msg.textContent = error.message;
      msg.className = "auth-msg error show";
    } else {
      msg.textContent = "Saved.";
      msg.className = "auth-msg success show";
      document.getElementById("product-form-wrap").style.display = "none";
      loadProductsTable();
    }
  });

  async function loadProductsTable() {
    const { data, error } = await window.sb.from("products").select("*").order("created_at", { ascending: false });
    const tbody = document.querySelector("#products-table tbody");
    if (error) {
      tbody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
      return;
    }
    tbody.innerHTML = (data || []).map(p => `
      <tr>
        <td>${p.name}</td>
        <td>$${Number(p.price).toFixed(2)}</td>
        <td>
          <input type="number" min="0" value="${p.stock}" style="width:60px;" data-stock-id="${p.id}" />
        </td>
        <td>${p.active ? '<span class="status-pill status-delivered">active</span>' : '<span class="status-pill status-cancelled">hidden</span>'}</td>
        <td>
          <button class="icon-link-btn" data-edit="${p.id}">Edit</button> ·
          <button class="icon-link-btn danger" data-delete="${p.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-stock-id]").forEach(input => {
      input.addEventListener("change", async () => {
        const id = input.getAttribute("data-stock-id");
        const stock = parseInt(input.value, 10);
        const { error } = await window.sb.from("products").update({ stock }).eq("id", id);
        if (error) alert("Failed to update stock: " + error.message);
      });
    });

    tbody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = data.find(x => x.id === btn.getAttribute("data-edit"));
        editingId = p.id;
        document.getElementById("product-form-title").textContent = "EDIT PRODUCT";
        document.getElementById("pf-name").value = p.name;
        document.getElementById("pf-slug").value = p.slug;
        document.getElementById("pf-description").value = p.description || "";
        document.getElementById("pf-price").value = p.price;
        document.getElementById("pf-oldprice").value = p.old_price || "";
        document.getElementById("pf-stock").value = p.stock;
        document.getElementById("pf-category").value = p.category || "";
        document.getElementById("pf-badge").value = p.badge || "";
        document.getElementById("pf-image").value = p.image_url || "";
        document.getElementById("pf-active").checked = p.active;
        document.getElementById("product-form-wrap").style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    tbody.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this product permanently?")) return;
        const { error } = await window.sb.from("products").delete().eq("id", btn.getAttribute("data-delete"));
        if (error) alert("Failed to delete: " + error.message);
        else loadProductsTable();
      });
    });
  }

  // ---------------- Orders ----------------
  async function loadOrdersTable() {
    const { data, error } = await window.sb
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    const tbody = document.querySelector("#orders-table tbody");
    if (error) {
      tbody.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
      return;
    }
    const emailMap = await getUserEmails((data || []).map(o => o.user_id));
    const statuses = ["pending", "paid", "shipped", "delivered", "cancelled"];
    tbody.innerHTML = (data || []).map(o => `
      <tr>
        <td>#${o.id.slice(0, 8)}</td>
        <td>${emailMap[o.user_id] || o.user_id.slice(0, 8)}</td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td>${o.order_items.map(i => `${i.quantity}× ${i.product_name}`).join("<br/>")}</td>
        <td>$${Number(o.subtotal).toFixed(2)}</td>
        <td>
          <select data-order-status="${o.id}">
            ${statuses.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" style="color:var(--muted)">No orders yet.</td></tr>`;

    tbody.querySelectorAll("[data-order-status]").forEach(sel => {
      sel.addEventListener("change", async () => {
        const { error } = await window.sb.from("orders").update({ status: sel.value }).eq("id", sel.getAttribute("data-order-status"));
        if (error) alert("Failed to update status: " + error.message);
      });
    });
  }

  // ---------------- Reviews moderation ----------------
  async function loadReviewsTable() {
    const { data, error } = await window.sb
      .from("reviews")
      .select("*, products(name)")
      .order("created_at", { ascending: false });
    const tbody = document.querySelector("#reviews-table tbody");
    if (error) {
      tbody.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
      return;
    }
    tbody.innerHTML = (data || []).map(r => `
      <tr>
        <td>${r.products?.name || "-"}</td>
        <td>${r.author_name}</td>
        <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
        <td>${r.comment || ""}</td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><button class="icon-link-btn danger" data-del-review="${r.id}">Delete</button></td>
      </tr>
    `).join("") || `<tr><td colspan="6" style="color:var(--muted)">No reviews yet.</td></tr>`;

    tbody.querySelectorAll("[data-del-review]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this review?")) return;
        const { error } = await window.sb.from("reviews").delete().eq("id", btn.getAttribute("data-del-review"));
        if (error) alert("Failed: " + error.message);
        else loadReviewsTable();
      });
    });
  }

  // ---------------- Init ----------------
  (async function init() {
    const ok = await gate();
    if (!ok) return;
    initTabs();
    loadInsights();
    loadProductsTable();
    loadOrdersTable();
    loadReviewsTable();
  })();
})();
