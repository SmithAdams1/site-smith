/* Smith & Adams - conversion & attribution tracking.
 * Loaded on every page (after consent.js, which owns the Google tag GT-TWZKWC9P
 * that routes to GA4 + Google Ads). This file:
 *   1. captures gclid / utm on first landing and persists them (first-touch),
 *   2. exposes window.saLeadContext() so forms can attach that attribution,
 *   3. exposes window.saTrackLead(type, extra) to fire a GA4 `generate_lead`
 *      event (and a Google Ads conversion where a label exists),
 *   4. auto-tracks tel: and WhatsApp link clicks.
 * Consent Mode (set in consent.js) still gates whether these use cookies. */
(function () {
  'use strict';

  var ADS_ID = 'AW-18073134136';
  // Google Ads conversion labels. `guide` reuses the existing brochure action;
  // add the others once the conversion actions are created in Google Ads.
  var ADS_LABELS = {
    guide: 'lp-brochure-download',
    contact: null,
    consultation: null,
    property: null
  };

  var ATTR_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var STORE = 'sa_attr';

  // ---- 1. capture attribution (first-touch wins, kept for later forms) ----
  try {
    var qs = new URLSearchParams(location.search);
    var store = {};
    try { store = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) {}
    var changed = false;
    ATTR_KEYS.forEach(function (k) {
      var v = qs.get(k);
      if (v && !store[k]) { store[k] = v; changed = true; }
    });
    if (changed) {
      if (!store.landing_page) store.landing_page = location.pathname;
      try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) {}
    }
  } catch (e) {}

  // GA4 client id lives in the _ga cookie as "GA1.1.<clientId>.<ts>" once the
  // Google tag has set it (consent granted). It lets the CRM send offline
  // qualify_lead / close_convert_lead events back to GA4 via the Measurement
  // Protocol, tied to the same user, so Ads gets the MQL/SQL conversions.
  function gaClientId() {
    try {
      var m = document.cookie.match(/_ga=GA\d\.\d\.([\d.]+)/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  window.saLeadContext = function () {
    var ctx = {};
    try { ctx = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) {}
    var cid = gaClientId();
    if (cid) ctx.ga_client_id = cid;
    return ctx;
  };

  // ---- 2. fire a lead conversion (GA4 + Google Ads) ----
  window.saTrackLead = function (type, extra) {
    try {
      if (typeof window.gtag !== 'function') return;
      var ctx = window.saLeadContext() || {};
      var params = { lead_type: type || 'lead' };
      for (var k in ctx) { if (Object.prototype.hasOwnProperty.call(ctx, k)) params[k] = ctx[k]; }
      if (extra) { for (var e2 in extra) { if (Object.prototype.hasOwnProperty.call(extra, e2)) params[e2] = extra[e2]; } }
      window.gtag('event', 'generate_lead', params);
      var label = ADS_LABELS[type];
      if (label) window.gtag('event', 'conversion', { send_to: ADS_ID + '/' + label });
    } catch (e) {}
  };

  // ---- 3. tel + WhatsApp click tracking ----
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || typeof window.gtag !== 'function') return;
    var href = a.getAttribute('href') || '';
    if (/^tel:/i.test(href)) window.gtag('event', 'click_call', { link_url: href });
    else if (/(wa\.me|api\.whatsapp\.com|whatsapp:)/i.test(href)) window.gtag('event', 'click_whatsapp', { link_url: href });
  }, true);
})();
