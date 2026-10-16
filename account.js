(function () {
  const loggedOut = document.getElementById("logged-out");
  const loggedIn = document.getElementById("logged-in");
  const loginView = document.getElementById("login-view");
  const signupView = document.getElementById("signup-view");

  document.getElementById("show-signup").addEventListener("click", (e) => {
    e.preventDefault();
    loginView.style.display = "none";
    signupView.style.display = "block";
  });
  document.getElementById("show-login").addEventListener("click", (e) => {
    e.preventDefault();
    signupView.style.display = "none";
    loginView.style.display = "block";
  });

  function showMsg(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = `auth-msg ${type} show`;
  }

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await window.AUTH.signIn(
        document.getElementById("login-email").value.trim(),
        document.getElementById("login-password").value
      );
      location.reload();
    } catch (err) {
      showMsg("login-msg", err.message, "error");
    }
  });

  document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await window.AUTH.signUp(
        document.getElementById("signup-email").value.trim(),
        document.getElementById("signup-password").value,
        document.getElementById("signup-name").value.trim()
      );
      showMsg("signup-msg", "Account created! You can sign in now.", "success");
    } catch (err) {
      showMsg("signup-msg", err.message, "error");
    }
  });

  document.getElementById("signout-btn").addEventListener("click", async () => {
    await window.AUTH.signOut();
    location.reload();
  });

  function statusPillHtml(status) {
    return `<span class="status-pill status-${status}">${status}</span>`;
  }

  async function loadOrders(userId) {
    const list = document.getElementById("orders-list");
    const { data: orders, error } = await window.sb
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      list.innerHTML = `<p class="login-prompt">Could not load orders: ${error.message}</p>`;
      return;
    }
    if (!orders || orders.length === 0) {
      list.innerHTML = `<p class="login-prompt">You haven't placed any orders yet. <a href="index.html">Start shopping</a>.</p>`;
      return;
    }
    list.innerHTML = orders.map(o => `
      <div style="border:1px solid var(--line);padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <strong style="font-size:12px;">Order #${o.id.slice(0, 8)}</strong>
          ${statusPillHtml(o.status)}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px;">
          Placed ${new Date(o.created_at).toLocaleString()} — Total $${Number(o.subtotal).toFixed(2)}
        </div>
        <div style="font-size:12px;">
          ${o.order_items.map(i => `${i.quantity}× ${i.product_name} (${i.size || "-"}, ${i.color || "-"}) — $${Number(i.unit_price).toFixed(2)}`).join("<br/>")}
        </div>
      </div>
    `).join("");
  }

  async function init() {
    const user = await window.AUTH.getUser();
    if (!user) {
      loggedOut.style.display = "block";
      loggedIn.style.display = "none";
      return;
    }
    loggedOut.style.display = "none";
    loggedIn.style.display = "block";
    document.getElementById("welcome-msg").textContent = `Signed in as ${user.email}`;

    const profile = await window.AUTH.getProfile();
    if (profile && profile.role === "admin") {
      document.getElementById("admin-link").style.display = "inline-block";
    }

    loadOrders(user.id);
  }

  init();
})();
