// Shared auth helpers used across every page (nav account icon, account.html,
// admin.html, checkout.html, product.js reviews form).
(function () {
  const AUTH = {
    async getUser() {
      const { data } = await window.sb.auth.getUser();
      return data.user || null;
    },

    async getProfile() {
      const user = await AUTH.getUser();
      if (!user) return null;
      const { data, error } = await window.sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) {
        console.error("getProfile error:", error.message);
        return null;
      }
      return data;
    },

    async isAdmin() {
      const profile = await AUTH.getProfile();
      return !!profile && profile.role === "admin";
    },

    async signUp(email, password, fullName) {
      const { data, error } = await window.sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || email } },
      });
      if (error) throw error;
      return data;
    },

    async signIn(email, password) {
      const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      await window.sb.auth.signOut();
    },

    // Updates the little account icon's title/href based on login state, and
    // runs on every page that includes this script.
    async refreshNavAccount() {
      const link = document.querySelector(".account-link");
      if (!link) return;
      const user = await AUTH.getUser();
      if (user) {
        link.setAttribute("title", `Signed in as ${user.email}`);
        link.href = "account.html";
      } else {
        link.setAttribute("title", "Sign in");
        link.href = "account.html";
      }
    },
  };

  window.AUTH = AUTH;
  document.addEventListener("DOMContentLoaded", () => AUTH.refreshNavAccount());
})();
