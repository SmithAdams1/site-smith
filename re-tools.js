// Property page tools: buying-cost and mortgage calculators (EUR/USD/GBP at
// the ECB reference rate), similar properties and a printable PDF.
// property.html calls SAPropertyTools.mount(p, root, locale) after rendering.
//
// IMT tables: Oficio-Circulado 40129/2026 (Tabelas I and III, mainland,
// in force from 1 January 2026). Non-resident flat 7.5% on housing: art. 17.10
// CIMT, added by Decreto-Lei 97/2026; scope per Oficio-Circulado 40131/2026.
// Update both tables together when the State Budget moves the brackets.
(function () {
  var SB = 'https://bcjtkfipcfvvitglgpys.supabase.co/rest/v1/';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

  // [upper limit, marginal rate, amount to deduct]; above the last row a
  // single rate applies to the whole value.
  var IMT = {
    hpp: { rows: [[106346, 0, 0], [145470, .02, 2126.92], [198347, .05, 6491.02], [330539, .07, 10457.96], [660982, .08, 13763.35]],
           flat: [[1150853, .06], [Infinity, .075]] },
    sec: { rows: [[106346, .01, 0], [145470, .02, 1063.46], [198347, .05, 5427.56], [330539, .07, 9394.50], [633931, .08, 12699.89]],
           flat: [[1150853, .06], [Infinity, .075]] }
  };
  var STAMP_PURCHASE = 0.008;   // Imposto do Selo, verba 1.1
  var STAMP_LOAN = 0.006;       // Imposto do Selo, verba 17.1.4 (loans of 5+ years)

  function imt(value, profile) {
    if (!(value > 0)) return 0;
    if (profile === 'nonres') return value * 0.075;
    var t = IMT[profile] || IMT.sec;
    for (var i = 0; i < t.rows.length; i++) {
      if (value <= t.rows[i][0]) return Math.max(0, value * t.rows[i][1] - t.rows[i][2]);
    }
    for (var j = 0; j < t.flat.length; j++) {
      if (value <= t.flat[j][0]) return value * t.flat[j][1];
    }
    return 0;
  }

  var TX = {
    en: {
      costs: 'Buying costs', mort: 'Mortgage', calc: 'Calculators', currency: 'Currency',
      price: 'Purchase price', profile: 'Buyer', p_hpp: 'Main home, Portuguese tax resident', p_sec: 'Second home or investment, Portuguese tax resident',
      p_nonres: 'Non-resident buyer', imt: 'Property transfer tax (IMT)', stamp: 'Stamp duty (0.8%)', total: 'Taxes on purchase',
      deposit: 'Deposit', rate: 'Interest rate', term: 'Term', years: 'years', monthly: 'Monthly payment', loan: 'Loan amount',
      loanstamp: 'Stamp duty on the loan (0.6%)', totint: 'Total interest',
      nonres_note: 'Non-residents pay a single 7.5% IMT rate on housing. The general tables apply if you were tax resident in Portugal before, and the difference can be reclaimed if you become resident within two years.',
      note: 'Indicative figures for mainland Portugal, 2026 rates. Notary, registration and legal fees are not included. Not tax advice.',
      fx: 'Exchange rate: European Central Bank reference rate of ', fxfail: 'Exchange rate unavailable, showing euros.',
      similar: 'Similar properties', pdf: 'Download PDF', view: 'View', from: 'From'
    },
    pt: {
      costs: 'Custos de compra', mort: 'Crédito habitação', calc: 'Simuladores', currency: 'Moeda',
      price: 'Preço de compra', profile: 'Comprador', p_hpp: 'Habitação própria e permanente, residente fiscal', p_sec: 'Segunda habitação ou investimento, residente fiscal',
      p_nonres: 'Comprador não residente', imt: 'IMT', stamp: 'Imposto do Selo (0,8%)', total: 'Impostos na compra',
      deposit: 'Entrada', rate: 'Taxa de juro', term: 'Prazo', years: 'anos', monthly: 'Prestação mensal', loan: 'Montante do empréstimo',
      loanstamp: 'Imposto do Selo sobre o empréstimo (0,6%)', totint: 'Total de juros',
      nonres_note: 'Os não residentes pagam uma taxa única de IMT de 7,5% na compra de habitação. Aplicam-se as tabelas gerais a quem já foi residente fiscal em Portugal, e a diferença pode ser recuperada se passar a residir no país nos dois anos seguintes.',
      note: 'Valores indicativos para Portugal continental, taxas de 2026. Não inclui notário, registos nem honorários. Não constitui aconselhamento fiscal.',
      fx: 'Câmbio: taxa de referência do Banco Central Europeu de ', fxfail: 'Câmbio indisponível, valores em euros.',
      similar: 'Imóveis semelhantes', pdf: 'Descarregar PDF', view: 'Ver', from: 'Desde'
    }
  };

  var CSS = '' +
    '.rt-sec{background:var(--paper);padding:0 24px clamp(48px,6vw,80px);}' +
    '.rt-wrap{max-width:1200px;margin:0 auto;}' +
    '.rt-h{font-family:var(--display);font-size:22px;font-weight:600;color:#11222D;margin:0 0 16px;}' +
    '.rt-box{background:#fff;border:1px solid #E4E1DA;border-radius:2px;}' +
    '.rt-tabs{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid #E4E1DA;padding:0 20px;}' +
    '.rt-tabs [role=tablist]{display:flex;gap:4px;}' +
    '.rt-tab{background:none;border:0;border-bottom:2px solid transparent;padding:16px 10px 14px;font:600 14px var(--sans);color:#6A7883;cursor:pointer;}' +
    '.rt-tab[aria-selected=true]{color:#11222D;border-bottom-color:#11222D;}' +
    '.rt-cur{display:flex;gap:2px;border:1px solid #E4E1DA;border-radius:2px;padding:2px;}' +
    '.rt-cur button{background:none;border:0;padding:6px 10px;font:600 12px var(--sans);color:#11222D;cursor:pointer;border-radius:2px;}' +
    '.rt-cur button[aria-pressed=true]{background:#11222D;color:#fff;}' +
    '.rt-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;padding:24px 20px;}' +
    '.rt-panel[hidden]{display:none;}' +
    '.rt-f label{display:block;font:500 11px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:#6A7883;margin:0 0 7px;}' +
    '.rt-f{margin-bottom:16px;}' +
    '.rt-f input,.rt-f select{width:100%;border:1px solid #E4E1DA;border-radius:2px;padding:11px 12px;font:15px var(--sans);color:#11222D;background:#fff;}' +
    '.rt-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
    '.rt-out{border-top:1px solid #11222D;}' +
    '.rt-row{display:flex;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid #E4E1DA;font:15px var(--sans);color:#26333C;}' +
    '.rt-row b{font-weight:600;color:#11222D;white-space:nowrap;}' +
    '.rt-row.big b{font-family:var(--display);font-size:24px;font-weight:500;}' +
    '.rt-note{font:12.5px/1.6 var(--sans);color:#6A7883;margin:12px 0 0;}' +
    '.rt-sim{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;}' +
    '.rt-card{display:flex;flex-direction:column;text-decoration:none;color:inherit;background:#fff;border:1px solid #E4E1DA;border-radius:2px;overflow:hidden;}' +
    '.rt-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}' +
    '.rt-card div{padding:14px 16px 16px;}' +
    '.rt-card p{margin:0;font:12px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:#6A7883;}' +
    '.rt-card h3{margin:6px 0 8px;font:500 16px/1.3 var(--display);color:#11222D;}' +
    '.rt-card span{font:600 16px var(--sans);color:#11222D;}' +
    '@media(max-width:860px){.rt-panel{grid-template-columns:1fr;}.rt-sim{grid-template-columns:1fr 1fr;}}' +
    '.rt-doc{display:none;}' +
    '@media print{' +
    '  @page{size:A4;margin:12mm}' +
    '  body>*:not(.rt-doc){display:none!important}' +
    '  body{background:#fff!important}' +
    '  .rt-doc{display:block;font-family:var(--sans);color:#26333C;font-size:9.5pt;line-height:1.55}' +
    '  .rt-doc *{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '  .rt-dh{display:flex;justify-content:space-between;align-items:center;padding-bottom:4mm;border-bottom:1px solid #E4E1DA}' +
    '  .rt-dh img{height:10mm}' +
    '  .rt-dh span{font-size:8pt;color:#6A7883;text-align:right}' +
    '  .rt-dt{display:flex;justify-content:space-between;align-items:flex-end;gap:8mm;margin:6mm 0 4mm}' +
    '  .rt-dt p{margin:0;font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#6A7883}' +
    '  .rt-dt h1{margin:1.5mm 0 0;font:500 20pt/1.1 var(--display);color:#11222D}' +
    '  .rt-dt b{font:500 18pt var(--display);color:#11222D;white-space:nowrap}' +
    '  .rt-dimg{display:grid;grid-template-columns:2fr 1fr;grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:2mm;height:82mm;overflow:hidden}' +
    '  .rt-dimg img{width:100%;height:100%;min-height:0;object-fit:cover;display:block}' +
    '  .rt-dimg img:first-child{grid-row:1/3}' +
    '  .rt-dspec{display:grid;grid-template-columns:repeat(4,1fr);margin:5mm 0;border-top:1px solid #11222D}' +
    '  .rt-dspec div{padding:2.5mm 0;border-bottom:1px solid #E4E1DA}' +
    '  .rt-dspec dt{font-size:6.5pt;letter-spacing:.12em;text-transform:uppercase;color:#6A7883}' +
    '  .rt-dspec dd{margin:.5mm 0 0;font-size:10.5pt;color:#11222D;font-weight:600}' +
    '  .rt-dbody{columns:2;column-gap:8mm}' +
    '  .rt-dbody p{margin:0 0 2.5mm}' +
    '  .rt-dhl{margin:4mm 0 0;padding:0;list-style:none;columns:3;font-size:8.5pt}' +
    '  .rt-dhl li{padding:1mm 0}' +
    '  .rt-df{margin-top:6mm;padding-top:4mm;border-top:1px solid #E4E1DA;display:flex;justify-content:space-between;font-size:8pt;color:#6A7883}' +
    '}' +
    '';

  function money(v, cur, rate, L) {
    var x = v * (cur === 'EUR' ? 1 : rate);
    return new Intl.NumberFormat(L === 'pt' ? 'pt-PT' : 'en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(x);
  }

  function mount(p, root, L) {
    var t = TX[L] || TX.en;
    if (!document.getElementById('rt-css')) {
      var st = document.createElement('style'); st.id = 'rt-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var pick = function (o) { return o == null ? '' : (typeof o === 'string' ? o : (o[L] || o.en || o.pt || '')); };

    // Download PDF prints a purpose-built property sheet (.rt-doc); on screen it
    // stays hidden, in print it is the only thing shown.
    buildDoc(p, L, t, esc, pick);
    var cta = root.querySelector('a[href="#pd-enquire"]');
    if (cta) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'satoshi rt-noprint';
      b.style.cssText = 'display:inline-flex;align-items:center;gap:8px;background:transparent;color:#11222D;padding:12px 20px;border:1px solid #11222D;border-radius:2px;font-weight:600;cursor:pointer;';
      b.textContent = t.pdf;
      b.addEventListener('click', function () { window.print(); });
      cta.parentNode.appendChild(b);
    }

    var price = Number(p.price) || 0;
    var sec = document.createElement('section');
    sec.className = 'rt-sec';
    sec.innerHTML = '<div class="rt-wrap">' +
      (price && !p.sold && p.transaction_type !== 'rent' ? (
      '<h2 class="rt-h">' + t.calc + '</h2>' +
      '<div class="rt-box">' +
        '<div class="rt-tabs"><div role="tablist">' +
          '<button class="rt-tab" role="tab" aria-selected="true" data-tab="costs">' + t.costs + '</button>' +
          '<button class="rt-tab" role="tab" aria-selected="false" data-tab="mort">' + t.mort + '</button></div>' +
          '<div class="rt-cur" role="group" aria-label="' + t.currency + '">' +
            ['EUR', 'USD', 'GBP'].map(function (c) { return '<button type="button" data-cur="' + c + '" aria-pressed="' + (c === 'EUR') + '">' + c + '</button>'; }).join('') +
        '</div></div>' +
        '<div class="rt-panel" data-panel="costs">' +
          '<div><div class="rt-f"><label for="rt-price">' + t.price + ' (EUR)</label><input id="rt-price" type="number" min="0" step="1000" value="' + price + '"></div>' +
          '<div class="rt-f"><label for="rt-prof">' + t.profile + '</label><select id="rt-prof">' +
            '<option value="nonres">' + t.p_nonres + '</option><option value="sec">' + t.p_sec + '</option><option value="hpp">' + t.p_hpp + '</option></select></div>' +
          '<p class="rt-note" id="rt-nonres">' + t.nonres_note + '</p></div>' +
          '<div class="rt-out"><div class="rt-row"><span>' + t.imt + '</span><b id="rt-imt"></b></div>' +
          '<div class="rt-row"><span>' + t.stamp + '</span><b id="rt-stamp"></b></div>' +
          '<div class="rt-row big"><span>' + t.total + '</span><b id="rt-total"></b></div>' +
          '<p class="rt-note">' + t.note + '</p><p class="rt-note" id="rt-fx1"></p></div>' +
        '</div>' +
        '<div class="rt-panel" data-panel="mort" hidden>' +
          '<div><div class="rt-f"><label for="rt-mprice">' + t.price + ' (EUR)</label><input id="rt-mprice" type="number" min="0" step="1000" value="' + price + '"></div>' +
          '<div class="rt-2"><div class="rt-f"><label for="rt-dep">' + t.deposit + ' (%)</label><input id="rt-dep" type="number" min="0" max="100" step="5" value="30"></div>' +
          '<div class="rt-f"><label for="rt-rate">' + t.rate + ' (%)</label><input id="rt-rate" type="number" min="0" step="0.1" value="3.5"></div></div>' +
          '<div class="rt-f"><label for="rt-term">' + t.term + ' (' + t.years + ')</label><input id="rt-term" type="number" min="1" max="40" step="1" value="25"></div></div>' +
          '<div class="rt-out"><div class="rt-row big"><span>' + t.monthly + '</span><b id="rt-pmt"></b></div>' +
          '<div class="rt-row"><span>' + t.loan + '</span><b id="rt-loan"></b></div>' +
          '<div class="rt-row"><span>' + t.totint + '</span><b id="rt-int"></b></div>' +
          '<div class="rt-row"><span>' + t.loanstamp + '</span><b id="rt-lstamp"></b></div>' +
          '<p class="rt-note">' + t.note + '</p><p class="rt-note" id="rt-fx2"></p></div>' +
        '</div>' +
      '</div>') : '') +
      '<div id="rt-similar" style="margin-top:44px;display:none;"><h2 class="rt-h">' + t.similar + '</h2><div class="rt-sim"></div></div>' +
      '</div>';
    root.appendChild(sec);

    // ---- calculators ----
    var cur = 'EUR', fx = { EUR: 1 }, fxDate = '';
    var $ = function (id) { return document.getElementById(id); };
    function calc() {
      if (!$('rt-price')) return;
      var shown = fx[cur] ? cur : 'EUR', r = fx[cur] || 1;
      var v = Number($('rt-price').value) || 0, prof = $('rt-prof').value;
      var i = imt(v, prof), s = v * STAMP_PURCHASE;
      $('rt-imt').textContent = money(i, shown, r, L);
      $('rt-stamp').textContent = money(s, shown, r, L);
      $('rt-total').textContent = money(i + s, shown, r, L);
      $('rt-nonres').style.display = prof === 'nonres' ? '' : 'none';
      var mp = Number($('rt-mprice').value) || 0, dep = Math.min(100, Math.max(0, Number($('rt-dep').value) || 0));
      var loan = mp * (1 - dep / 100), n = Math.max(1, Math.round(Number($('rt-term').value) || 25)) * 12;
      var mr = (Number($('rt-rate').value) || 0) / 100 / 12;
      var pmt = mr ? loan * mr / (1 - Math.pow(1 + mr, -n)) : loan / n;
      $('rt-pmt').textContent = money(pmt, shown, r, L);
      $('rt-loan').textContent = money(loan, shown, r, L);
      $('rt-int').textContent = money(Math.max(0, pmt * n - loan), shown, r, L);
      $('rt-lstamp').textContent = money(loan * STAMP_LOAN, shown, r, L);
      var note = cur === 'EUR' ? '' : (fx[cur] ? t.fx + fxDate + ': 1 EUR = ' + fx[cur].toFixed(4) + ' ' + cur + '.' : t.fxfail);
      $('rt-fx1').textContent = note; $('rt-fx2').textContent = note;
    }
    sec.querySelectorAll('.rt-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        sec.querySelectorAll('.rt-tab').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        sec.querySelectorAll('.rt-panel').forEach(function (pn) { pn.hidden = pn.getAttribute('data-panel') !== b.getAttribute('data-tab'); });
      });
    });
    sec.querySelectorAll('.rt-cur button').forEach(function (b) {
      b.addEventListener('click', function () {
        cur = b.getAttribute('data-cur');
        sec.querySelectorAll('.rt-cur button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (cur !== 'EUR' && !fx[cur]) loadFx().then(calc); else calc();
      });
    });
    sec.querySelectorAll('input,select').forEach(function (el) { el.addEventListener('input', calc); });
    var fxReq = null;
    function loadFx() {
      // Frankfurter serves the ECB daily reference rates, no key, CORS open.
      fxReq = fxReq || fetch('https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP')
        .then(function (r) { return r.json(); })
        .then(function (rows) {
          (Array.isArray(rows) ? rows : []).forEach(function (x) { if (x && x.quote && x.rate) { fx[x.quote] = x.rate; fxDate = x.date || fxDate; } });
        })
        .catch(function () {});
      return fxReq;
    }
    calc();

    // ---- similar properties: same region and type, price within +/-40% ----
    var q = 'properties?status=eq.published&slug=neq.' + encodeURIComponent(p.slug) +
      '&select=slug,title,cover_image,images,price,currency,city,region,upcoming&limit=4&order=featured.desc,created_at.desc';
    if (p.region) q += '&region=eq.' + encodeURIComponent(p.region);
    if (p.property_type) q += '&property_type=eq.' + encodeURIComponent(p.property_type);
    if (price) q += '&price=gte.' + Math.round(price * 0.6) + '&price=lte.' + Math.round(price * 1.4);
    fetch(SB + q, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) return;
        var box = $('rt-similar');
        box.querySelector('.rt-sim').innerHTML = rows.map(function (s) {
          var img = s.cover_image || (Array.isArray(s.images) && s.images[0]) || '';
          return '<a class="rt-card" href="/property/' + encodeURIComponent(s.slug) + '">' +
            (img ? '<img src="' + esc(img) + '" alt="' + esc(pick(s.title)) + '" loading="lazy">' : '') +
            '<div><p>' + esc([s.city, s.region].filter(Boolean).join(', ')) + '</p><h3>' + esc(pick(s.title)) + '</h3>' +
            (s.price ? '<span>' + (s.upcoming ? t.from + ' ' : '') + money(Number(s.price), 'EUR', 1, L) + '</span>' : '') + '</div></a>';
        }).join('');
        box.style.display = '';
      }).catch(function () {});
  }

  function buildDoc(p, L, t, esc, pick) {
    var old = document.querySelector('.rt-doc'); if (old) old.remove();
    var imgs = (Array.isArray(p.images) && p.images.length ? p.images : [p.cover_image]).filter(Boolean).slice(0, 3);
    var price = p.sold ? (L === 'pt' ? 'Vendido' : 'Sold') : (p.price ? (p.upcoming ? t.from + ' ' : '') + money(Number(p.price), 'EUR', 1, L) : (L === 'pt' ? 'Sob consulta' : 'Price on application'));
    var D = L === 'pt'
      ? { beds: 'Quartos', baths: 'Casas de banho', area: 'Área', plot: 'Terreno', year: 'Ano', energy: 'Cert. energético', type: 'Tipo', ref: 'Referência', hl: 'Destaques' }
      : { beds: 'Bedrooms', baths: 'Bathrooms', area: 'Area', plot: 'Plot', year: 'Year built', energy: 'Energy rating', type: 'Type', ref: 'Reference', hl: 'Highlights' };
    var spec = [];
    if (p.bedrooms) spec.push([D.beds, p.bedrooms]);
    if (p.bathrooms) spec.push([D.baths, p.bathrooms]);
    if (p.area_sqm) spec.push([D.area, Math.round(p.area_sqm) + ' m²']);
    if (p.plot_sqm) spec.push([D.plot, Math.round(p.plot_sqm) + ' m²']);
    if (p.year_built) spec.push([D.year, p.year_built]);
    if (p.energy_rating) spec.push([D.energy, p.energy_rating]);
    if (p.property_type) spec.push([D.type, p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1)]);
    if (p.reference) spec.push([D.ref, p.reference]);
    var hl = []; var rh = p.highlights; if (rh) { hl = Array.isArray(rh) ? rh : (rh[L] || rh.en || []); }
    var desc = pick(p.description).replace(/<(?!\/?(p|br|strong|em|b|i)\b)[^>]*>/gi, '');
    if (!/<p\b/i.test(desc)) desc = '<p>' + desc + '</p>';
    var doc = document.createElement('div');
    doc.className = 'rt-doc';
    doc.innerHTML =
      '<div class="rt-dh"><img src="/logo.png" alt="Smith &amp; Adams"><span>+351 938 227 348 / +351 214 086 709 &middot; geral@smithandadams.com<br>www.smithandadams.com/property/' + esc(p.slug) + '</span></div>' +
      '<div class="rt-dt"><div><p>' + esc([p.city, p.region].filter(Boolean).join(', ')) + '</p><h1>' + esc(pick(p.title)) + '</h1></div><b>' + esc(price) + '</b></div>' +
      (imgs.length ? '<div class="rt-dimg"' + (imgs.length < 3 ? ' style="grid-template-columns:1fr;grid-template-rows:minmax(0,1fr)"' : '') + '>' + imgs.map(function (u) { return '<img src="' + esc(u) + '" alt="">'; }).join('') + '</div>' : '') +
      (spec.length ? '<dl class="rt-dspec">' + spec.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
      '<div class="rt-dbody">' + desc + '</div>' +
      (hl.length ? '<ul class="rt-dhl">' + hl.map(function (h) { return '<li>&middot; ' + esc(pick(h)) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="rt-df"><span>Smith &amp; Adams &middot; ' + (L === 'pt' ? 'Mediação imobiliária' : 'Real estate mediation') + ': Benefit Discovery, Lda, AMI 27772</span><span>' + new Date().toLocaleDateString(L === 'pt' ? 'pt-PT' : 'en-GB') + '</span></div>';
    document.body.appendChild(doc);
  }

  window.SAPropertyTools = { mount: mount, imt: imt };
})();
