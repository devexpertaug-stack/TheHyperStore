// Loads the product catalog from Supabase. Falls back to a small local
// sample so the site still renders something useful if Supabase hasn't
// been configured yet (see js/config.js).
(function () {
  const FALLBACK_PRODUCTS = [
    { id: "wide-leg-black", db_id: null, name: "WIDE LEG CARGO PANTS", img: "assets/p1.svg", oldPrice: "$120", newPrice: "$84.00", price: 84.0, badge: "SALE 30%", stock: 25, description: "" },
    { id: "double-knee-grey", db_id: null, name: "DOUBLE KNEE SWEATPANTS", img: "assets/p2.svg", oldPrice: "$110", newPrice: "$77.00", price: 77.0, badge: "SALE 30%", stock: 18, description: "" },
    { id: "parachute-navy", db_id: null, name: "PARACHUTE TRACK PANTS", img: "assets/p3.svg", oldPrice: "$130", newPrice: "$91.00", price: 91.0, badge: "SALE 30%", stock: 12, description: "" },
    { id: "pleated-cream", db_id: null, name: "PLEATED WOOL TROUSERS", img: "assets/p4.svg", oldPrice: "$140", newPrice: "$98.00", price: 98.0, badge: "SALE 30%", stock: 9, description: "" },
    { id: "baggy-brown", db_id: null, name: "BAGGY CORDUROY PANTS", img: "assets/p5.svg", oldPrice: "$125", newPrice: "$87.00", price: 87.0, badge: "SALE 30%", stock: 20, description: "" },
    { id: "flared-white", db_id: null, name: "FLARED DENIM JEANS", img: "assets/p6.svg", oldPrice: "$135", newPrice: "$94.00", price: 94.0, badge: "SALE 30%", stock: 15, description: "" },
  ];

  function mapRow(row) {
    return {
      id: row.slug,
      db_id: row.id,
      name: row.name,
      description: row.description || "",
      img: row.image_url || "assets/p1.svg",
      oldPrice: row.old_price != null ? `$${Number(row.old_price).toFixed(0)}` : "",
      newPrice: `$${Number(row.price).toFixed(2)}`,
      price: Number(row.price),
      badge: row.badge || "",
      stock: row.stock,
    };
  }

  async function loadProducts() {
    if (!window.sb) {
      window.PRODUCTS = FALLBACK_PRODUCTS;
      return FALLBACK_PRODUCTS;
    }
    try {
      const { data, error } = await window.sb
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        window.PRODUCTS = FALLBACK_PRODUCTS;
        return FALLBACK_PRODUCTS;
      }
      const mapped = data.map(mapRow);
      window.PRODUCTS = mapped;
      return mapped;
    } catch (err) {
      console.warn("Falling back to local product data:", err.message);
      window.PRODUCTS = FALLBACK_PRODUCTS;
      return FALLBACK_PRODUCTS;
    }
  }

  window.loadProducts = loadProducts;
})();
