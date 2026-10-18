(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const loginGate = $("#admin-login-gate");
  const forbidden = $("#admin-forbidden");
  const dashboard = $("#admin-dashboard");
  const signoutBtn = $("#admin-signout");

  $("#admin-login-form").addEventListener("submit", async event => {
    event.preventDefault();
    const msg = $("#admin-login-msg");
    try {
      await window.AUTH.signIn($("#admin-email").value.trim(), $("#admin-password").value);
      location.reload();
    } catch (error) {
      msg.textContent = error.message || "Unable to sign in.";
      msg.className = "auth-msg error show";
    }
  });
  signoutBtn.addEventListener("click", async () => { await window.AUTH.signOut(); location.reload(); });

  async function gate() {
    const user = await window.AUTH.getUser();
    if (!user) { loginGate.style.display = "block"; return false; }
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

  function activateTab(name) {
    $$(".admin-tab").forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $$(".admin-section").forEach(section => section.classList.toggle("active", section.id === "tab-" + name));
  }
  function initTabs() {
    $$(".admin-tab").forEach(tab => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
    $$("[data-go-tab]").forEach(button => button.addEventListener("click", () => activateTab(button.dataset.goTab)));
  }
  const formatINR = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }
  function statusPill(status) {
    const safeStatus = String(status || "pending").toLowerCase().replace(/[^a-z-]/g, "");
    return `<span class="status-pill status-${safeStatus}">${escapeHtml(status || "pending")}</span>`;
  }
  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `auth-msg ${type} show`;
  }

  async function getUserLabels(userIds) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return {};
    const { data, error } = await window.sb.from("profiles").select("id,email,full_name").in("id", ids);
    if (error) console.warn("Could not load customer profiles:", error.message);
    const labels = {};
    (data || []).forEach(profile => { labels[profile.id] = profile.full_name || profile.email || profile.id.slice(0, 8); });
    return labels;
  }

  async function loadInsights() {
    const [{ data: orders, error: ordersError }, { data: products, error: productsError }] = await Promise.all([
      window.sb.from("orders").select("*, order_items(*)"),
      window.sb.from("products").select("*")
    ]);
    if (ordersError) console.error("Could not load orders:", ordersError.message);
    if (productsError) console.error("Could not load products:", productsError.message);
    const allOrders = orders || [];
    const validOrders = allOrders.filter(order => order.status !== "cancelled");
    $("#stat-revenue").textContent = formatINR(validOrders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0));
    $("#stat-orders").textContent = allOrders.length;
    $("#stat-customers").textContent = new Set(allOrders.map(order => order.user_id)).size;
    $("#stat-lowstock").textContent = (products || []).filter(product => Number(product.stock) <= 5).length;

    const sales = {};
    validOrders.forEach(order => (order.order_items || []).forEach(item => {
      const key = item.product_name || "Product";
      if (!sales[key]) sales[key] = { units: 0, revenue: 0 };
      sales[key].units += Number(item.quantity || 0);
      sales[key].revenue += Number(item.unit_price || 0) * Number(item.quantity || 0);
    }));
    const top = Object.entries(sales).sort((a,b) => b[1].units - a[1].units).slice(0,5);
    $("#top-products-table tbody").innerHTML = top.length
      ? top.map(([name,value]) => `<tr><td>${escapeHtml(name)}</td><td>${value.units}</td><td>${formatINR(value.revenue)}</td></tr>`).join("")
      : '<tr><td colspan="3" class="empty-cell">No sales yet.</td></tr>';

    const recent = [...allOrders].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,8);
    const labels = await getUserLabels(recent.map(order => order.user_id));
    $("#recent-orders-table tbody").innerHTML = recent.length
      ? recent.map(order => `<tr><td>#${escapeHtml(String(order.id).slice(0,8))}</td><td>${escapeHtml(labels[order.user_id] || String(order.user_id).slice(0,8))}</td><td>${new Date(order.created_at).toLocaleDateString("en-IN")}</td><td>${statusPill(order.status)}</td><td>${formatINR(order.subtotal)}</td></tr>`).join("")
      : '<tr><td colspan="5" class="empty-cell">No orders yet.</td></tr>';
  }

  // Products / stock
  let editingProductId = null;
  function resetProductForm() {
    editingProductId = null;
    $("#product-form").reset();
    $("#pf-active").checked = true;
    $("#product-form-title").textContent = "Add product";
    $("#product-form-msg").className = "auth-msg";
  }
  $("#new-product-btn").addEventListener("click", () => {
    resetProductForm(); $("#product-form-wrap").style.display = "block"; $("#pf-name").focus();
  });
  $("#cancel-product-form").addEventListener("click", () => { $("#product-form-wrap").style.display = "none"; });
  $("#product-form").addEventListener("submit", async event => {
    event.preventDefault();
    const msg = $("#product-form-msg");
    const payload = {
      name: $("#pf-name").value.trim(), slug: $("#pf-slug").value.trim(), description: $("#pf-description").value.trim(),
      price: Number($("#pf-price").value), old_price: $("#pf-oldprice").value ? Number($("#pf-oldprice").value) : null,
      stock: Number.parseInt($("#pf-stock").value,10), category: $("#pf-category").value.trim(), badge: $("#pf-badge").value.trim(),
      image_url: $("#pf-image").value.trim(), active: $("#pf-active").checked
    };
    if (!payload.name || !payload.slug || !Number.isFinite(payload.price) || payload.price < 0 || !Number.isInteger(payload.stock) || payload.stock < 0) {
      showMessage(msg, "Enter a name, slug, valid price and non-negative whole-number stock quantity.", "error"); return;
    }
    const result = editingProductId
      ? await window.sb.from("products").update(payload).eq("id", editingProductId)
      : await window.sb.from("products").insert(payload);
    if (result.error) { showMessage(msg, result.error.message, "error"); return; }
    showMessage(msg, "Product saved.", "success");
    $("#product-form-wrap").style.display = "none";
    await loadProductsTable();
  });

  async function loadProductsTable() {
    const { data, error } = await window.sb.from("products").select("*").order("created_at", { ascending: false });
    const tbody = $("#products-table tbody");
    if (error) { tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">${escapeHtml(error.message)}</td></tr>`; return; }
    tbody.innerHTML = (data || []).map(product => `
      <tr><td><strong>${escapeHtml(product.name)}</strong><div class="table-subtext">${escapeHtml(product.slug)}</div></td>
      <td>${formatINR(product.price)}</td>
      <td><input class="inline-number" type="number" min="0" step="1" value="${Number(product.stock)}" data-stock-id="${escapeHtml(product.id)}" aria-label="Stock for ${escapeHtml(product.name)}" /></td>
      <td>${product.active ? '<span class="status-pill status-delivered">Visible</span>' : '<span class="status-pill status-cancelled">Hidden</span>'}</td>
      <td class="row-actions"><button class="text-action" data-edit-product="${escapeHtml(product.id)}">Edit</button><button class="text-action danger" data-delete-product="${escapeHtml(product.id)}">Delete</button></td></tr>`).join("") || '<tr><td colspan="5" class="empty-cell">No products yet.</td></tr>';

    $$("[data-stock-id]", tbody).forEach(input => input.addEventListener("change", async () => {
      const stock = Number.parseInt(input.value,10);
      if (!Number.isInteger(stock) || stock < 0) { alert("Stock must be a non-negative whole number."); return; }
      input.disabled = true;
      const { error } = await window.sb.from("products").update({ stock }).eq("id", input.dataset.stockId);
      input.disabled = false;
      if (error) alert("Failed to update stock: " + error.message);
    }));
    $$("[data-edit-product]", tbody).forEach(button => button.addEventListener("click", () => {
      const product = data.find(item => item.id === button.dataset.editProduct);
      if (!product) return;
      editingProductId = product.id;
      $("#product-form-title").textContent = "Edit product";
      $("#pf-name").value = product.name; $("#pf-slug").value = product.slug;
      $("#pf-description").value = product.description || ""; $("#pf-price").value = product.price;
      $("#pf-oldprice").value = product.old_price ?? ""; $("#pf-stock").value = product.stock;
      $("#pf-category").value = product.category || ""; $("#pf-badge").value = product.badge || "";
      $("#pf-image").value = product.image_url || ""; $("#pf-active").checked = !!product.active;
      $("#product-form-msg").className = "auth-msg";
      $("#product-form-wrap").style.display = "block";
      window.scrollTo({ top: $("#product-form-wrap").getBoundingClientRect().top + window.scrollY - 100, behavior:"smooth" });
    }));
    $$("[data-delete-product]", tbody).forEach(button => button.addEventListener("click", async () => {
      if (!confirm("Delete this product permanently?")) return;
      const { error } = await window.sb.from("products").delete().eq("id", button.dataset.deleteProduct);
      if (error) alert("Failed to delete product: " + error.message); else await loadProductsTable();
    }));
  }

  // Customer / Hype Coins editor. Balance writes go through an admin-checked RPC.
  let customers = [];
  async function loadCustomers() {
    const tbody = $("#customers-table tbody");
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Loading customers…</td></tr>';
    const [{ data: profiles, error: profileError }, { data: orders, error: ordersError }] = await Promise.all([
      window.sb.from("profiles").select("id,email,full_name,hype_coins,created_at").order("created_at", { ascending:false }),
      window.sb.from("orders").select("user_id,subtotal,status")
    ]);
    if (profileError || ordersError) {
      const error = profileError || ordersError;
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">${escapeHtml(error.message)}<br/>Apply the migration in <code>supabase/migrations</code> if the hype_coins column is missing.</td></tr>`;
      return;
    }
    const totals = {};
    (orders || []).filter(order => order.status !== "cancelled").forEach(order => {
      if (!totals[order.user_id]) totals[order.user_id] = { count:0, spent:0 };
      totals[order.user_id].count += 1;
      totals[order.user_id].spent += Number(order.subtotal || 0);
    });
    customers = (profiles || []).map(profile => ({ ...profile, orderCount:totals[profile.id]?.count || 0, totalSpent:totals[profile.id]?.spent || 0 }));
    renderCustomers();
  }
  function renderCustomers() {
    const search = $("#customer-search").value.trim().toLowerCase();
    const filtered = customers.filter(customer => `${customer.full_name || ""} ${customer.email || ""}`.toLowerCase().includes(search));
    $("#customers-table tbody").innerHTML = filtered.map(customer => `
      <tr><td><strong>${escapeHtml(customer.full_name || "Customer")}</strong><div class="table-subtext">Joined ${customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-IN") : "—"}</div></td>
      <td>${escapeHtml(customer.email || "—")}</td><td>${customer.orderCount}</td><td>${formatINR(customer.totalSpent)}</td>
      <td><span class="coin-balance">✦ ${Number(customer.hype_coins || 0).toLocaleString("en-IN")}</span></td>
      <td><button class="text-action" data-edit-coins="${escapeHtml(customer.id)}">Edit balance</button></td></tr>`).join("") || '<tr><td colspan="6" class="empty-cell">No customers match this search.</td></tr>';
    $$("[data-edit-coins]").forEach(button => button.addEventListener("click", () => openCoinsEditor(button.dataset.editCoins)));
  }
  function openCoinsEditor(customerId) {
    const customer = customers.find(row => row.id === customerId);
    if (!customer) return;
    const slot = $("#coin-editor-slot");
    slot.replaceChildren();
    const editor = document.createElement("section");
    editor.className = "coin-editor";
    editor.setAttribute("aria-labelledby", "coin-editor-title");
    editor.innerHTML = `<div><strong id="coin-editor-title">Adjust Hype Coins</strong><p>${escapeHtml(customer.full_name || customer.email || "Customer")}</p><p class="coin-current">Current balance: ${Number(customer.hype_coins || 0).toLocaleString("en-IN")} coins</p></div>
      <form id="coin-edit-form"><label for="coin-balance-input">New total balance</label><input id="coin-balance-input" type="number" min="0" max="2147483647" step="1" required value="${Number(customer.hype_coins || 0)}" />
      <div class="form-actions"><button type="submit">SAVE BALANCE</button><button type="button" class="btn btn-outline" id="cancel-coin-edit">CANCEL</button></div><small>This replaces the customer's current balance. Customers cannot edit their own balance.</small></form>`;
    slot.appendChild(editor);
    $("#cancel-coin-edit").addEventListener("click", () => slot.replaceChildren());
    $("#coin-edit-form").addEventListener("submit", async event => {
      event.preventDefault();
      const value = Number($("#coin-balance-input").value);
      if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) {
        showMessage($("#customer-msg"), "Enter a non-negative whole number within the supported range.", "error"); return;
      }
      const submit = $("#coin-edit-form button[type=submit]");
      submit.disabled = true;
      const { error } = await window.sb.rpc("admin_set_hype_coins", { p_user_id: customer.id, p_hype_coins: value });
      submit.disabled = false;
      if (error) {
        showMessage($("#customer-msg"), "Could not update Hype Coins: " + error.message + ". Confirm the database migration has been applied.", "error");
        return;
      }
      customer.hype_coins = value;
      slot.replaceChildren();
      showMessage($("#customer-msg"), "Hype Coins balance updated successfully.", "success");
      renderCustomers();
    });
    $("#coin-balance-input").focus();
  }
  $("#customer-search").addEventListener("input", renderCustomers);
  $("#refresh-customers").addEventListener("click", loadCustomers);

  async function loadOrdersTable() {
    const { data, error } = await window.sb.from("orders").select("*, order_items(*)").order("created_at", { ascending:false });
    const tbody = $("#orders-table tbody");
    if (error) { tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">${escapeHtml(error.message)}</td></tr>`; return; }
    const labels = await getUserLabels((data || []).map(order => order.user_id));
    const statuses = ["pending","paid","shipped","delivered","cancelled"];
    tbody.innerHTML = (data || []).map(order => `
      <tr><td>#${escapeHtml(String(order.id).slice(0,8))}</td><td>${escapeHtml(labels[order.user_id] || String(order.user_id).slice(0,8))}</td>
      <td>${new Date(order.created_at).toLocaleDateString("en-IN")}</td><td>${(order.order_items || []).map(item => `${Number(item.quantity)}× ${escapeHtml(item.product_name)}`).join("<br/>")}</td>
      <td>${formatINR(order.subtotal)}</td><td><select class="inline-select" data-order-status="${escapeHtml(order.id)}">${statuses.map(status => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></td></tr>`).join("") || '<tr><td colspan="6" class="empty-cell">No orders yet.</td></tr>';
    $$("[data-order-status]", tbody).forEach(select => select.addEventListener("change", async () => {
      select.disabled = true;
      const { error } = await window.sb.from("orders").update({ status:select.value }).eq("id", select.dataset.orderStatus);
      select.disabled = false;
      if (error) alert("Failed to update order status: " + error.message);
    }));
  }

  async function loadReviewsTable() {
    const { data, error } = await window.sb.from("reviews").select("*, products(name)").order("created_at", { ascending:false });
    const tbody = $("#reviews-table tbody");
    if (error) { tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">${escapeHtml(error.message)}</td></tr>`; return; }
    tbody.innerHTML = (data || []).map(review => `<tr><td>${escapeHtml(review.products?.name || "—")}</td><td>${escapeHtml(review.author_name)}</td><td class="review-stars">${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</td><td>${escapeHtml(review.comment || "")}</td><td>${new Date(review.created_at).toLocaleDateString("en-IN")}</td><td><button class="text-action danger" data-delete-review="${escapeHtml(review.id)}">Delete</button></td></tr>`).join("") || '<tr><td colspan="6" class="empty-cell">No reviews yet.</td></tr>';
    $$("[data-delete-review]", tbody).forEach(button => button.addEventListener("click", async () => {
      if (!confirm("Delete this review?")) return;
      const { error } = await window.sb.from("reviews").delete().eq("id", button.dataset.deleteReview);
      if (error) alert("Could not delete review: " + error.message); else await loadReviewsTable();
    }));
  }

  (async function init() {
    try {
      const ok = await gate();
      if (!ok) return;
      initTabs();
      await Promise.all([loadInsights(), loadProductsTable(), loadCustomers(), loadOrdersTable(), loadReviewsTable()]);
    } catch (error) {
      console.error("Admin initialization failed:", error);
      loginGate.style.display = "block";
      showMessage($("#admin-login-msg"), "Unable to initialize the dashboard. Check Supabase configuration, then try again.", "error");
    }
  })();
})();