// Initializes the shared Supabase client (loaded via CDN script tag in each
// HTML page, before this file). Exposes it as window.sb for every other
// script to use.
(function () {
  if (!window.supabase) {
    console.error("Supabase SDK not loaded. Check the <script> tag order.");
    return;
  }
  if (!window.SUPABASE_URL || window.SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
    console.warn(
      "Supabase is not configured yet. Edit js/config.js with your project URL and anon key."
    );
  }
  window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
})();
