/* ============================================================
   Smith & Adams — consent + measurement (Consent Mode v2, RGPD)
   ------------------------------------------------------------
   The consent DEFAULT (denied) is set by a tiny inline snippet at the
   top of every <head> (before the gtag config), so no cookie/pixel fires
   until the visitor accepts. This file renders the banner and, on the
   visitor's choice, updates consent + (on accept) starts GA4.

   TODO: set GA4_ID to the real Measurement ID from GA4 Admin > Data
   Streams > (Web stream) > "Measurement ID" — it looks like G-XXXXXXXXXX.
   NOTE: 382833872 is the numeric Property ID, NOT the Measurement ID.
   ============================================================ */
(function () {
  "use strict";
  var GA4_ID = "G-XXXXXXXXXX"; // <-- replace with the real G- id
  var ADS_ID = "AW-18073134136";
  var STORE = "sa_consent"; // "granted" | "denied"

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var ga4Ready = /^G-[A-Z0-9]{6,}$/i.test(GA4_ID) && GA4_ID.indexOf("X") < 0;

  // Ensure the gtag library is present (some pages had no tag at all).
  function ensureGtagLib() {
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + (ga4Ready ? GA4_ID : ADS_ID);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", ADS_ID);
  }

  function apply(state) {
    gtag("consent", "update", {
      ad_storage: state,
      analytics_storage: state,
      ad_user_data: state,
      ad_personalization: state,
    });
    if (state === "granted") {
      ensureGtagLib();
      if (ga4Ready) gtag("config", GA4_ID, { anonymize_ip: true });
    }
  }

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  if (saved === "granted") { apply("granted"); return; }
  if (saved === "denied") { return; }

  // ---- Banner (only when no choice stored) ----
  function buildBanner() {
    var wrap = document.createElement("div");
    wrap.id = "sa-consent";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Cookie consent");
    wrap.innerHTML =
      '<div class="sa-consent__card">' +
      '<p class="sa-consent__text">We use cookies to measure traffic and improve your experience. ' +
      'You can accept analytics &amp; marketing cookies or continue with only what is essential. ' +
      'See our <a href="/privacy">Privacy Policy</a>.</p>' +
      '<div class="sa-consent__actions">' +
      '<button type="button" class="sa-consent__btn sa-consent__btn--ghost" data-consent="denied">Essential only</button>' +
      '<button type="button" class="sa-consent__btn sa-consent__btn--solid" data-consent="granted">Accept all</button>' +
      "</div></div>";
    var css =
      "#sa-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;justify-content:center;padding:16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}" +
      "#sa-consent .sa-consent__card{max-width:760px;width:100%;background:#11222D;color:#fff;border-radius:6px;box-shadow:0 18px 44px rgba(17,34,45,.35);padding:18px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}" +
      "#sa-consent .sa-consent__text{margin:0;font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.85);flex:1 1 320px}" +
      "#sa-consent .sa-consent__text a{color:#fff;text-decoration:underline}" +
      "#sa-consent .sa-consent__actions{display:flex;gap:10px;flex:0 0 auto}" +
      "#sa-consent .sa-consent__btn{cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;transition:opacity .2s}" +
      "#sa-consent .sa-consent__btn--solid{background:#fff;color:#11222D;border-color:#fff}" +
      "#sa-consent .sa-consent__btn:hover{opacity:.85}" +
      "@media(max-width:560px){#sa-consent .sa-consent__actions{width:100%}#sa-consent .sa-consent__btn{flex:1}}";
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-consent]");
      if (!b) return;
      var choice = b.getAttribute("data-consent");
      try { localStorage.setItem(STORE, choice); } catch (err) {}
      apply(choice);
      wrap.remove();
    });
    document.body.appendChild(wrap);
  }

  if (document.body) buildBanner();
  else document.addEventListener("DOMContentLoaded", buildBanner);
})();
