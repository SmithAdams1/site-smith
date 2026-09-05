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
  // Google Ads conversion labels, keyed by lead type. INTENTIONALLY EMPTY:
  // the two direct website actions these used to point to ("Enviar formulario
  // de leads" = w_EoCJ..., "Contacto" = l5vTC...) were removed in the CRM
  // (bloco 164). The ACTIVE Ads conversion path is now the GA4 `generate_lead`
  // event below, imported into Google Ads as a Primary action. Firing a direct
  // Ads conversion here as well would (a) go to a non-existent action and (b)
  // double-count once re-created. To add a direct action later: create ONE
  // website conversion action, put its label here, and demote the GA4 import to
  // Secondary so the same lead is not counted twice.
  var ADS_LABELS = {
    guide: null, brochure: null, consultation: null, contact: null,
    property: null, 'property-management': null, whatsapp: null, call: null
  };

  // Estimated lead VALUES (EUR) so GA4 and Ads can optimise toward value, not
  // just count. These are relative proxies for lead quality, NOT revenue -
  // tune them once you know your lead->deal economics.
  var LEAD_VALUES = {
    consultation:        200,
    property:            120,
    'property-management': 80,
    contact:             80,
    whatsapp:            60,
    call:                60,
    guide:               40,
    brochure:            40,
    lead:                50
  };
  var LEAD_CURRENCY = 'EUR';

  function fireAds(type, value) {
    var label = ADS_LABELS[type];
    if (label && typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: ADS_ID + '/' + label,
        value: value != null ? value : (LEAD_VALUES[type] || 0),
        currency: LEAD_CURRENCY
      });
    }
  }

  var ATTR_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'rdt_cid',
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

  // Enhanced Conversions for Leads: hand the Google tag the user's first-party
  // email/phone so Google Ads can match this lead to the ad click even when
  // cookies are limited (recovers conversions lost to consent/ITP). Sent
  // unhashed over HTTPS; Google normalises (lowercase, E.164, trim) and SHA256s
  // it. Must be set BEFORE the conversion event fires. Ref: Google Ads Help
  // "Configure the Google tag for enhanced conversions for leads".
  function setUserData(email, phone) {
    if (typeof window.gtag !== 'function') return;
    var ud = {};
    if (email) { var e = String(email).trim().toLowerCase(); if (e) ud.email = e; }
    if (phone) {
      var p = String(phone).replace(/[^\d+]/g, '');
      if (p && p.charAt(0) !== '+') p = '+' + p;
      if (p.replace(/\D/g, '').length >= 8) ud.phone_number = p; // E.164
    }
    if (ud.email || ud.phone_number) window.gtag('set', 'user_data', ud);
  }

  // ---- 2. fire a lead conversion (GA4 + Google Ads) ----
  window.saTrackLead = function (type, extra) {
    try {
      if (typeof window.gtag !== 'function') return;
      type = type || 'lead';
      extra = extra || {};
      // Enhanced Conversions first (never forwarded into GA4 event params).
      setUserData(extra.email, extra.phone);
      var ctx = window.saLeadContext() || {};
      var value = (extra.value != null) ? extra.value : (LEAD_VALUES[type] || 0);
      var params = { lead_type: type, value: value, currency: LEAD_CURRENCY };
      for (var k in ctx) { if (Object.prototype.hasOwnProperty.call(ctx, k)) params[k] = ctx[k]; }
      var SKIP = { email: 1, phone: 1, value: 1 };
      for (var e2 in extra) { if (Object.prototype.hasOwnProperty.call(extra, e2) && !SKIP[e2]) params[e2] = extra[e2]; }
      window.gtag('event', 'generate_lead', params);
      fireAds(type, value);
      // Reddit Ads pixel (loaded by consent.js only on consent grant).
      if (window.rdt) { try { window.rdt('track', 'Lead'); } catch (e2) {} }
    } catch (e) {}
  };

  // ---- 3. tel + WhatsApp click tracking ----
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || typeof window.gtag !== 'function') return;
    var href = a.getAttribute('href') || '';
    if (/^tel:/i.test(href)) {
      window.gtag('event', 'click_call', { link_url: href, value: LEAD_VALUES.call, currency: LEAD_CURRENCY });
      fireAds('call');
    } else if (/(wa\.me|api\.whatsapp\.com|whatsapp:)/i.test(href)) {
      window.gtag('event', 'click_whatsapp', { link_url: href, value: LEAD_VALUES.whatsapp, currency: LEAD_CURRENCY });
      fireAds('whatsapp');
    }
  }, true);
})();
