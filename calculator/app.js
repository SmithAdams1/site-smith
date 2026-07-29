/* ============================================================
   SMITH & ADAMS · INVESTMENT CALCULATORS
   Calculation engines, i18n, and interactivity
   ============================================================ */

/* ----------- FORMATTERS ----------- */
const fmtEUR = (n, decimals = 0) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(Math.round(n * (decimals ? 100 : 1)) / (decimals ? 100 : 1));

const fmtPct = (n, decimals = 2) =>
  new Intl.NumberFormat('en-IE', {
    style: 'percent',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);

const num = (id) => {
  const el = document.getElementById(id);
  const v = parseFloat(el.value);
  return isNaN(v) ? 0 : v;
};

const set = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

/* ============================================================
   CONFIG — valores base (Google Sheets via Apps Script)
   Idênticos ao Excel. Actualizados automaticamente via fetch.
   Servem de fallback se o fetch falhar (offline / URL vazio).
   ============================================================ */
const CONFIG = {
  shared: {
    vatRate:         0.23,    // IVA 23%
    salesCommission: 0.05,    // Comissão de venda 5%
    capitalGainsTax: 0.19,    // IRS sobre mais-valias 19%
  },
  d2: {
    imtRate:          0.065,   // IMT 6.5%  — Excel F28
    isRate:           0.008,   // IS 0.8%   — Excel F29
    notaryBase:       865,     // Notário   — Excel D30
    legalAdvisory:    3500,    // Legal s/IVA — Excel D34
    visaFee:          931,     // Taxa visto/dep — Excel D35
    adminFees:        5000,    // Admin 5 anos  — Excel D39
    insuranceBase:    620,     // Seguro s/IVA  — Excel D40
    // Fixos no código (a Google Sheet NÃO sobrepõe estes dois — ver fetchConfig)
    appreciationRate: 0.05,    // Capital growth 5% / ano
    rentalYield:      0.07,    // Net income 7% / ano
  },
  /* D2 with Buy Back — sem custos de aquisição e sem valorização:
     o imóvel é recomprado pelo preço de compra ao fim de 5 anos.
     As restantes taxas (legal, visto, admin, seguro) são as do D2. */
  d2bb: {
    rentalYield: 0.07,         // Net rental income 7% / ano
  },
  gv: {
    defaultProperty:   171000,   // Imóvel subjacente — Excel J17
    imtRate:           0.065,    // Excel F29
    isRate:            0.008,    // Excel F30
    notaryBase:        850,      // Notário — Excel D31
    legalAdvisory:     10000,    // Legal s/IVA — Excel D36
    govFeesPerPerson:  12369.64, // Gov+renovações/pessoa — Excel D37
    fundMgmtRate:      0.0125,   // Gestão fundo 1.25% — Excel D42
    fundMgmtYears:     8,        // Excel E42
    depositoryPerYear: 750,      // Excel D43
    depositoryYears:   8,        // Excel E43
    cmvmPerYear:       100,      // Excel D44
    cmvmYears:         8,        // Excel E44
    auditPerYear:      400,      // Excel D45
    auditYears:        8,        // Excel E45
    subscriptionFee:   2500,     // Excel D46
    snaAdminPerYear:   5000,     // Excel D47
    snaAdminYears:     5,        // Excel E47
    appreciationRate:  0.07,     // Valorização anual 7%
    yieldRate:         0.05,     // Yield fundo 5%
  },
  inv: {
    imtRate:          0.065,   // Excel F27
    isRate:           0.008,   // Excel F28
    notaryBase:       865,     // Excel D29
    legalAdvisory:    1500,    // Excel D33
    companyIncorp:    1000,    // Excel D34
    appreciationRate: 0.07,    // 7% valorização anual
    rentalYield:      0.1038,  // 10.38% yield bruto anual
  },
};

/* ============================================================
   GOOGLE APPS SCRIPT URL
   Após fazer deploy do script na tua Google Sheet,
   substitui a string vazia pelo URL fornecido pelo Google.
   Exemplo: 'https://script.google.com/macros/s/AKfycb.../exec'
   ============================================================ */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8exW3tVAjlKZpf-uGDpIpbgcriLP_L6vPmlDvYw16GpWshIIbnlhMM9JSZ-o6bjnTHg/exec';

/* ============================================================
   D2 VISA CALCULATOR
   Replica as fórmulas do Excel ipsis verbis.
   ============================================================ */
function calcD2() {
  const property      = num('d2-property');
  const deps          = num('d2-deps');
  const mainInvestors = 1;          // Excel H15 (fixo)
  const vat           = CONFIG.shared.vatRate;
  const c             = CONFIG.d2;

  /* --- Property Acquisition Costs ---
     Excel: D28 = J16×F28 ; D29 = J16×F29 ; G30 = D30×1.23          */
  const imtBase  = property * c.imtRate;        // Excel D28
  const imt      = imtBase;                     // Excel G28 = D28
  const isBase   = property * c.isRate;         // Excel D29
  const is       = isBase;                      // Excel G29 = D29
  const notary   = c.notaryBase * (1 + vat);   // Excel G30 = D30×1.23
  const acqTotal = imt + is + notary;           // Excel G31

  /* --- Legal & Immigration Fees ---
     Excel: G34 = D34×1.23 ; G35 = D35×J15+H15                        */
  const legalAdvisory = c.legalAdvisory * (1 + vat);               // Excel G34
  const visaApp       = c.visaFee * Math.max(0, deps) + mainInvestors; // Excel G35
  const legalTotal    = legalAdvisory + visaApp;                    // Excel G36

  /* --- Other Fees ---
     Excel: G39 = D39 ; G40 = D40×1.23                                 */
  const adminFees     = c.adminFees;                                // Excel G39
  const insurance     = c.insuranceBase * (1 + vat);               // Excel G40
  const otherTotal    = adminFees + insurance;                      // Excel G41

  /* --- Grand Total --- Excel G43 = J16 + G31 + G36 + G41            */
  const grandTotal = property + acqTotal + legalTotal + otherTotal;

  /* --- ROI (5 years) ---
     Excel: appr = J16×7% (linear) ; yield = J16×10.38%               */
  const apprPerYear  = property * c.appreciationRate;
  const yieldRate    = c.rentalYield;
  const yieldPerYear = property * yieldRate;

  const roiRows = [];
  let projValue = property;
  let cumYield  = 0;
  for (let y = 1; y <= 5; y++) {
    projValue += apprPerYear;
    cumYield  += yieldPerYear;
    roiRows.push({ y, appr: apprPerYear, projValue, yield: yieldPerYear, cumROI: cumYield, roiPct: yieldRate });
  }

  const totalRental     = yieldPerYear * 5;             // Excel D65
  const totalAppr       = apprPerYear * 5;              // Excel D66
  const totalAccProfit  = totalRental + totalAppr;      // Excel D67
  const propY5          = property + totalAppr;         // Excel D68
  const effectiveCost   = grandTotal - totalRental;     // Excel D70 = D69 - E61
  const saleValue       = propY5;                       // Excel D71
  const commission      = saleValue * CONFIG.shared.salesCommission;  // Excel D72
  const netSaleProceeds = saleValue - commission - effectiveCost;      // Excel D73
  const cgt             = netSaleProceeds * CONFIG.shared.capitalGainsTax; // Excel D74
  const netProfit       = netSaleProceeds - cgt;        // Excel D75
  const totalROI        = totalAccProfit / grandTotal;  // Excel D76 = D67/D69
  const avgROI          = totalROI / 5;                 // Excel D77

  /* ---------- RENDER ---------- */
  set('d2-total',        fmtEUR(grandTotal));
  set('d2-property-out', fmtEUR(property));
  set('d2-acq-out',      fmtEUR(acqTotal));
  set('d2-legal-out',    fmtEUR(legalTotal));
  set('d2-other-out',    fmtEUR(otherTotal));

  set('d2-imt-base',   fmtEUR(imtBase));
  set('d2-imt',        fmtEUR(imt));
  set('d2-is-base',    fmtEUR(isBase));
  set('d2-is',         fmtEUR(is));
  set('d2-acq-sub',    fmtEUR(acqTotal));

  set('d2-other-sub',  fmtEUR(otherTotal));
  set('d2-visa-base',  fmtEUR(c.visaFee));
  set('d2-visa-total', fmtEUR(visaApp));
  set('d2-legal-sub',  fmtEUR(legalTotal));

  const tbodyD2 = document.getElementById('d2-roi-rows');
  if (tbodyD2) {
    tbodyD2.innerHTML = roiRows.map((r) => `
      <tr>
        <td>${getYearLabel(r.y)}</td>
        <td>${fmtEUR(r.appr)}</td>
        <td class="col-split">${fmtEUR(r.projValue)}</td>
        <td>${fmtPct(r.roiPct, 2)}</td>
        <td>${fmtEUR(r.yield)}</td>
        <td>${fmtEUR(r.cumROI)}</td>
      </tr>`).join('');
  }

  set('d2-rental',      fmtEUR(totalRental));
  set('d2-cap',         fmtEUR(totalAppr));
  set('d2-totalprofit', fmtEUR(totalAccProfit));
  set('d2-projy5',      fmtEUR(propY5));
  set('d2-totalcost',   fmtEUR(grandTotal));
  set('d2-effective',   fmtEUR(effectiveCost));
  set('d2-sale',        fmtEUR(saleValue));
  set('d2-comm',        fmtEUR(commission));
  set('d2-netsale',     fmtEUR(netSaleProceeds));
  set('d2-cgt',         fmtEUR(cgt));
  set('d2-profit',      fmtEUR(netProfit));
  set('d2-roi',         fmtPct(totalROI, 1));
  set('d2-avgroi',      fmtPct(avgROI, 2));
}

/* ============================================================
   D2 WITH BUY BACK CALCULATOR
   Diferenças face ao D2 normal:
     · sem custos de aquisição (IMT / IS / notário)
     · sem valorização — o imóvel é recomprado pelo preço de compra
     · retorno = 7% de rendimento líquido por ano (5 anos)
   ============================================================ */
function calcD2BB() {
  const property      = num('d2bb-property');
  const deps          = num('d2bb-deps');
  const mainInvestors = 1;
  const vat           = CONFIG.shared.vatRate;
  const c             = CONFIG.d2;        // taxas legais/admin partilhadas com o D2
  const cbb           = CONFIG.d2bb;     // yield próprio (7%)

  /* --- Legal & Immigration Fees (iguais ao D2) --- */
  const legalAdvisory = c.legalAdvisory * (1 + vat);
  const visaApp       = c.visaFee * Math.max(0, deps) + mainInvestors;
  const legalTotal    = legalAdvisory + visaApp;

  /* --- Other Fees (iguais ao D2) --- */
  const adminFees  = c.adminFees;
  const insurance  = c.insuranceBase * (1 + vat);
  const otherTotal = adminFees + insurance;

  /* --- Grand Total — sem custos de aquisição --- */
  const grandTotal = property + legalTotal + otherTotal;

  /* --- Rental income (7% / ano, sem valorização) --- */
  const yieldRate    = cbb.rentalYield;
  const incomePerYear = property * yieldRate;

  const roiRows = [];
  let cumIncome = 0;
  for (let y = 1; y <= 5; y++) {
    cumIncome += incomePerYear;
    roiRows.push({ y, income: incomePerYear, roiPct: yieldRate, cumROI: cumIncome });
  }

  /* --- 5-year outlook ---
     O capital é devolvido na recompra ao preço de compra, por isso os
     únicos custos afundados são as taxas legais e administrativas.      */
  const totalIncome   = incomePerYear * 5;
  const buyBackValue  = property;                         // recompra ao preço de compra
  const sunkCosts     = legalTotal + otherTotal;
  const effectiveCost = grandTotal - totalIncome;
  const netProfit     = totalIncome - sunkCosts;
  const totalROI      = netProfit / grandTotal;
  const avgROI        = totalROI / 5;

  /* ---------- RENDER ---------- */
  set('d2bb-total',        fmtEUR(grandTotal));
  set('d2bb-property-out', fmtEUR(property));
  set('d2bb-legal-out',    fmtEUR(legalTotal));
  set('d2bb-other-out',    fmtEUR(otherTotal));

  set('d2bb-visa-base',  fmtEUR(c.visaFee));
  set('d2bb-visa-total', fmtEUR(visaApp));
  set('d2bb-legal-sub',  fmtEUR(legalTotal));
  set('d2bb-other-sub',  fmtEUR(otherTotal));

  const tbody = document.getElementById('d2bb-roi-rows');
  if (tbody) {
    tbody.innerHTML = roiRows.map((r) => `
      <tr>
        <td>${getYearLabel(r.y)}</td>
        <td>${fmtPct(r.roiPct, 2)}</td>
        <td>${fmtEUR(r.income)}</td>
        <td>${fmtEUR(r.cumROI)}</td>
      </tr>`).join('');
  }

  set('d2bb-income',    fmtEUR(totalIncome));
  set('d2bb-buyback',   fmtEUR(buyBackValue));
  set('d2bb-totalcost', fmtEUR(grandTotal));
  set('d2bb-effective', fmtEUR(effectiveCost));
  set('d2bb-sunk',      fmtEUR(sunkCosts));
  set('d2bb-profit',    fmtEUR(netProfit));
  set('d2bb-roi',       fmtPct(totalROI, 1));
  set('d2bb-avgroi',    fmtPct(avgROI, 2));
}

/* ============================================================
   GOLDEN VISA CALCULATOR
   ============================================================ */
function calcGV() {
  const units              = Math.max(1, num('gv-units'));
  const underlyingProperty = num('gv-property');
  const deps               = num('gv-deps');
  const vat                = CONFIG.shared.vatRate;
  const c                  = CONFIG.gv;

  const participationUnit = units * 250000;

  /* --- Property Acquisition Costs ---
     Excel: G29 = J17×F29 ; G30 = J17×F30 ; G31 = D31×F31+D31        */
  const transferBase  = underlyingProperty * c.imtRate;      // Excel G29
  const transferTotal = transferBase;
  const stampDutyBase = underlyingProperty * c.isRate;       // Excel G30
  const stampDuty     = stampDutyBase;
  const notary        = c.notaryBase + c.notaryBase * vat;   // Excel G31 = D31×F31+D31
  const acqTotal      = transferTotal + stampDuty + notary;  // Excel G32
  const netPayable    = acqTotal + underlyingProperty;       // Excel row-net

  /* --- Legal & Government Fees ---
     Excel: G36 = D36×1.23 ; G37 = D37 ; G38 = D38×deps              */
  const legalAdvisory = c.legalAdvisory * (1 + vat);               // Excel G36
  const govMain       = c.govFeesPerPerson;                         // Excel G37
  const govDeps       = c.govFeesPerPerson * Math.max(0, deps);    // Excel G38
  const legalTotal    = legalAdvisory + govMain + govDeps;          // Excel G39

  /* --- Fund & Administrative Costs ---
     Excel: G42 = J16×D42×E42 ; G43 = D43×E43 ; etc.                 */
  const mgmtBase    = participationUnit * c.fundMgmtRate;
  const mgmt        = mgmtBase * c.fundMgmtYears;                   // Excel G42
  const depository  = c.depositoryPerYear * c.depositoryYears;      // Excel G43
  const cmvm        = c.cmvmPerYear * c.cmvmYears;                  // Excel G44
  const audit       = c.auditPerYear * c.auditYears;                // Excel G45
  const subscription = c.subscriptionFee;                           // Excel G46
  const snaBase     = c.snaAdminPerYear * units;                   // €5,000 per participation unit (1u→5,000 · 2u→10,000)
  const snaAdmin    = snaBase * c.snaAdminYears;                   // × 5 years (1u→25,000 · 2u→50,000)
  const fundTotal   = mgmt + depository + cmvm + audit + subscription + snaAdmin; // G48

  /* --- Yield Distribution (per Excel) ---
     Años 1-2: construction (sem yield)
     Años 3-5: 2.5% × PU / ano
     Año 6: 5% × PU (deferred para 2026+2027)                         */
  const yieldRate   = c.yieldRate;                       // 5% p.a.
  const annualYield = participationUnit * yieldRate;     // 5% × PU (1u→12,500 · 2u→25,000)
  const deferred    = annualYield * 2;                   // 2026+2027 deferred = two years' yield (10% × PU)
  const totalYield  = annualYield * 3 + deferred;        // 5 years × 5% = PU × 0.25

  /* --- Totals ---
     investmentCostBase = custo real excluindo capital PU (para ROI)   */
  const investmentCostBase = underlyingProperty + acqTotal + fundTotal;
  // Fund & administrative costs are already covered within the participation
  // unit value, so they are NOT added on top of the programme total.
  const grandTotal         = participationUnit + acqTotal + legalTotal;

  /* --- ROI (5 years) --- */
  const apprPerYear = participationUnit * c.appreciationRate;
  const roiRows     = [];
  let   projValue   = participationUnit;
  let   cumYield    = 0;
  for (let y = 1; y <= 5; y++) {
    projValue += apprPerYear;
    const yieldThisYear = y <= 2 ? 0 : annualYield;
    cumYield += yieldThisYear;
    roiRows.push({ y, appr: apprPerYear, projValue, yield: yieldThisYear, yieldRate: y <= 2 ? null : yieldRate, projROI: cumYield });
  }

  const totalAppr       = apprPerYear * 5;                       // Excel D89
  const totalRental     = totalYield;                            // Excel D88
  const totalAccProfit  = totalRental + totalAppr;               // Excel D90
  const propY5          = participationUnit + totalAppr;         // Excel D91
  const effectiveCost   = investmentCostBase - totalRental;      // Excel D93
  const saleValue       = propY5;                                // Excel D94
  const commission      = saleValue * CONFIG.shared.salesCommission;   // Excel D95
  const netSaleProceeds = saleValue - commission - effectiveCost;       // Excel D96
  const cgt             = netSaleProceeds * CONFIG.shared.capitalGainsTax; // Excel D97
  const netProfit       = netSaleProceeds - cgt;                 // Excel D98
  const totalROI        = totalAccProfit / investmentCostBase;   // Excel D99
  const avgROI          = totalROI / 5;                          // Excel D100

  /* ---------- RENDER ---------- */
  set('gv-total',      fmtEUR(grandTotal));
  set('gv-unit-out',   fmtEUR(participationUnit));
  set('gv-acq-out',    fmtEUR(acqTotal));
  set('gv-fund-out',   fmtEUR(fundTotal));
  set('gv-legal-out',  fmtEUR(legalTotal));
  set('gv-return-out', fmtEUR(totalYield));

  set('gv-transfer-base', fmtEUR(transferBase));
  set('gv-transfer',      fmtEUR(transferTotal));
  set('gv-stamp-base',    fmtEUR(stampDutyBase));
  set('gv-stamp',         fmtEUR(stampDuty));
  set('gv-acq-sub',       fmtEUR(acqTotal));
  set('gv-net-payable',   fmtEUR(netPayable));

  const depsRow = document.getElementById('gv-gov-deps-row');
  if (depsRow) depsRow.style.display = deps > 0 ? '' : 'none';
  set('gv-gov-deps',  fmtEUR(govDeps));
  set('gv-legal-sub', fmtEUR(legalTotal));

  set('gv-mgmt-base', fmtEUR(mgmtBase));
  set('gv-mgmt',      fmtEUR(mgmt));
  set('gv-sna-base',  fmtEUR(snaBase));
  set('gv-sna-total', fmtEUR(snaAdmin));
  set('gv-fund-sub',  fmtEUR(fundTotal));

  set('gv-y2028', fmtEUR(annualYield));
  set('gv-y2029', fmtEUR(annualYield));
  set('gv-y2030', fmtEUR(annualYield));
  set('gv-y2031', fmtEUR(deferred));
  set('gv-yield-total', fmtEUR(totalYield));

  set('gv-y2028-pct', fmtPct(yieldRate, 0));
  set('gv-y2029-pct', fmtPct(yieldRate, 0));
  set('gv-y2030-pct', fmtPct(yieldRate, 0));
  set('gv-y2031-pct', fmtPct(yieldRate * 2, 0));

  const tbodyGV = document.getElementById('gv-roi-rows');
  if (tbodyGV) {
    tbodyGV.innerHTML = roiRows.map((r) => `
      <tr>
        <td>${getYearLabel(r.y)}</td>
        <td>${fmtEUR(r.appr)}</td>
        <td>${fmtEUR(r.projValue)}</td>
      </tr>`).join('');
  }

  set('gv-rental',      fmtEUR(totalRental));
  set('gv-cap',         fmtEUR(totalAppr));
  set('gv-totalprofit', fmtEUR(totalAccProfit));
  set('gv-projy5',      fmtEUR(propY5));
  set('gv-totalcost',   fmtEUR(investmentCostBase));
  set('gv-effective',   fmtEUR(effectiveCost));
  set('gv-sale',        fmtEUR(saleValue));
  set('gv-comm',        fmtEUR(commission));
  set('gv-netsale',     fmtEUR(netSaleProceeds));
  set('gv-cgt',         fmtEUR(cgt));
  set('gv-profit',      fmtEUR(netProfit));
  set('gv-totalroi',    fmtPct(totalROI, 1));
  set('gv-avgroi',      fmtPct(avgROI, 2));
}

/* ============================================================
   INVESTMENT PROPERTY CALCULATOR
   ============================================================ */
function calcInv() {
  const property = num('inv-property');
  const type     = document.querySelector('input[name="inv-type"]:checked').value;
  const vat      = CONFIG.shared.vatRate;
  const c        = CONFIG.inv;

  /* --- Property Transfer Costs --- */
  const imtBase       = property * c.imtRate;
  const imt           = imtBase * (1 + c.imtRate);
  const isBase        = property * c.isRate;
  const is            = isBase;
  const notary        = c.notaryBase * (1 + vat);
  const transferTotal = imt + is + notary;

  /* --- Legal Fees --- */
  const advisory   = c.legalAdvisory * (1 + vat);
  const incorp     = type === 'Company' ? c.companyIncorp * (1 + vat) : 0;
  const legalTotal = advisory + incorp;

  const grandTotal = property + transferTotal + legalTotal;

  /* --- ROI Forecast (5 years) ---
     Valorização linear 7% · Yield bruto 10.38% sobre valor original
     CGT sobre produto líquido de venda (igual ao separador Investments da sheet) */
  const apprPerYear  = property * c.appreciationRate;
  const yieldPerYear = property * c.rentalYield;

  const roiRows = [];
  let projValue = property;
  let cumYield  = 0;
  for (let y = 1; y <= 5; y++) {
    projValue += apprPerYear;
    cumYield  += yieldPerYear;
    roiRows.push({ y, appr: apprPerYear, projValue, yieldAmt: yieldPerYear, cumROI: cumYield });
  }

  const totalRental        = yieldPerYear * 5;
  const totalAppr          = apprPerYear * 5;
  const propY5             = property + totalAppr;
  const commission         = propY5 * CONFIG.shared.salesCommission;
  const grossSaleProceeds  = propY5 - commission;
  const cgt                = grossSaleProceeds * CONFIG.shared.capitalGainsTax;
  const netFromSale        = grossSaleProceeds - cgt;
  const totalCash          = totalRental + netFromSale;
  const netProfit          = totalCash - grandTotal;
  const totalROI           = netProfit / grandTotal;
  const avgROI             = totalROI / 5;

  /* ---------- RENDER costs ---------- */
  set('inv-total',         fmtEUR(grandTotal));
  set('inv-property-out',  fmtEUR(property));
  set('inv-transfer-out',  fmtEUR(transferTotal));
  set('inv-legal-out',     fmtEUR(legalTotal));

  set('inv-imt-base',     fmtEUR(imtBase));
  set('inv-imt',          fmtEUR(imt));
  set('inv-is-base',      fmtEUR(isBase));
  set('inv-is',           fmtEUR(is));
  set('inv-transfer-sub', fmtEUR(transferTotal));

  const incorpRow = document.getElementById('inv-incorp-row');
  if (incorpRow) incorpRow.style.display = type === 'Company' ? '' : 'none';
  set('inv-incorp',     fmtEUR(incorp));
  set('inv-legal-sub',  fmtEUR(legalTotal));

  /* ---------- RENDER ROI ---------- */
  const tbodyInv = document.getElementById('inv-roi-rows');
  if (tbodyInv) {
    tbodyInv.innerHTML = roiRows.map((r) => `
      <tr>
        <td>${getYearLabel(r.y)}</td>
        <td>${fmtEUR(r.appr)}</td>
        <td>${fmtEUR(r.projValue)}</td>
        <td>${fmtEUR(r.yieldAmt)}</td>
        <td>${fmtEUR(r.cumROI)}</td>
      </tr>`).join('');
  }

  set('inv-rental',       fmtEUR(totalRental));
  set('inv-cap',          fmtEUR(totalAppr));
  set('inv-totalprofit',  fmtEUR(totalRental + totalAppr));
  set('inv-projy5',       fmtEUR(propY5));
  set('inv-sale',         fmtEUR(propY5));
  set('inv-totalcost',    fmtEUR(grandTotal));
  set('inv-grosssale',    fmtEUR(grossSaleProceeds));
  set('inv-comm',         fmtEUR(commission));
  set('inv-cgt',          fmtEUR(cgt));
  set('inv-netsale',      fmtEUR(netFromSale));
  set('inv-profit',       fmtEUR(netProfit));
  set('inv-roi',          fmtPct(totalROI, 2));
  set('inv-avgroi',       fmtPct(avgROI, 2));
}

/* ============================================================
   INTERNATIONALISATION (EN / PT)
   ============================================================ */
const i18n = {
  en: {
    'hero.eyebrow': 'Investment & Residency Calculators',
    'hero.title':   'Invest in <em>Lisbon</em>.',
    'hero.lede':    'Estimate the full cost, taxes, fees and projected returns of our four signature programmes. All figures are indicative and updated to current Portuguese law.',

    'tabs.d2':   'D2 Visa',
    'tabs.d2bb': 'D2 with Buy Back',
    'tabs.gv':   'Golden Visa',
    'tabs.inv':  'Property Investment',

    'common.assumptions': 'Your assumptions',
    'common.breakdown':   'Detailed fees & cost breakdown',
    'common.roi':         'ROI forecast',
    'common.feeCost':     'Fee / Cost',
    'common.base':        'Base',
    'common.tax':         'Tax',
    'common.years':       'Years',
    'common.total':       'Total',
    'common.subtotal':    'Subtotal',
    'common.year':        'Year',
    'common.appreciation':'Appreciation',
    'common.projValue':   'Projected property value',
    'common.yield':       'Yield',
    'common.cumROI':      'Cumulative ROI',
    'common.projROI':     'Projected ROI',
    'common.roiPct':      'ROI %',
    'common.yieldPct':    'Yield %',
    'common.fiveYear':    '5-year outlook',
    'common.event':       'Event',
    'common.amount':      'Amount',
    'common.exportPDF':   'Export Simulation',
    'common.downloadMOU': 'Download MOU',
    'common.legalDocs':   'Legal Docs',
    'common.aiAnalysis':  'AI Analysis',

    /* Legal Documents */
    'legal.title':       'Legal Documents',
    'legal.sub':         'Enter the access password to view legal documents.',
    'legal.pwPlaceholder':'Password',
    'legal.enter':       'Enter',
    'legal.error':       'Incorrect password. Please try again.',
    'legal.placeholder': 'Legal documents for this programme will be available here.',

    /* D2 */
    'd2.kicker': 'Programme 01',
    'd2.title':  'D2 Visa <em>·</em> Residency through Property',
    'd2.sub':    'A 5-year residency programme combining a property acquisition in Portugal with the D2 visa for the main applicant and their family.',
    'd2.input.property': 'Property investment value',
    'd2.input.main':     'Main applicants',
    'd2.input.deps':     'Dependents',
    'd2.input.note':     'Base programme covers a family of 4. Additional fees apply beyond that.',
    'd2.summary.label':  'Total estimated cost · 5-year programme',
    'd2.summary.property':'Property',
    'd2.summary.acq':    'Property acquisition costs',
    'd2.summary.legal':  'Legal & immigration fees',
    'd2.summary.other':  'Administrative & other',
    'd2.b.acq':          'Property acquisition costs',
    'd2.b.imt':          'Property Transfer Tax (IMT)',
    'd2.b.is':           'Stamp Duty (IS)',
    'd2.b.notary':       'Notary & Registration Fees',
    'd2.b.legal':        'Legal & immigration fees',
    'd2.b.advisory':     'Legal advisory services (5Y · family of 4)',
    'd2.b.visa':         'D2 visa application & renewals',
    'd2.b.other':        'Administrative & other costs',
    'd2.b.admin':        'Administrative fees (5 years)',
    'd2.b.ins':          'Insurance coverage',
    'd2.roi.sub':        '7% net income · 5% capital growth',
    'd2.roi.sub2':       'Pessimist projection based on Market Projection',
    'd2.roi.rental':     'Total net rental income',
    'd2.roi.cap':        'Estimated appreciation of property',
    'd2.roi.totalProfit':'Total accumulated profit',
    'd2.roi.projY5':     'Projected property value (Year 5)',
    'd2.roi.totalCost':  'Total cost of investment',
    'd2.roi.effective':  'Effective net investment cost (after yield and appreciation)',
    'd2.roi.sale':       'Projected sale value',
    'd2.roi.comm':       'Sales commission (5%)',
    'd2.roi.net':        'Net sale value',
    'd2.roi.cgt':        'Capital gains tax (19%)',
    'd2.roi.profit':     'Actual net profit',
    'd2.roi.totalROI':   'Total ROI over 5 years',
    'd2.roi.avgROI':     'Average annual ROI',

    /* D2 WITH BUY BACK */
    'd2bb.kicker': 'Programme 02',
    'd2bb.title':  'D2 Visa <em>·</em> with Buy Back',
    'd2bb.sub':    'A 5-year residency programme with a guaranteed buy back of the property at the original purchase price, with no property acquisition costs for the investor.',
    'd2bb.input.property': 'Property investment value',
    'd2bb.input.main':     'Main applicants',
    'd2bb.input.deps':     'Dependents',
    'd2bb.input.note':     'Base programme covers a family of 4. Additional fees apply beyond that.',
    'd2bb.summary.label':  'Total estimated cost · 5-year programme',
    'd2bb.summary.property':'Property',
    'd2bb.summary.legal':  'Legal & immigration fees',
    'd2bb.summary.other':  'Administrative & other',
    'd2bb.summary.note':   'No property acquisition costs (IMT, Stamp Duty or notary) apply under the buy back structure.',
    'd2bb.b.legal':        'Legal & immigration fees',
    'd2bb.b.advisory':     'Legal advisory services (5Y · family of 4)',
    'd2bb.b.visa':         'D2 visa application & renewals',
    'd2bb.b.other':        'Administrative & other costs',
    'd2bb.b.admin':        'Administrative fees (5 years)',
    'd2bb.b.ins':          'Insurance coverage',
    'd2bb.roi.sub':        '7% rental income per year',
    'd2bb.roi.sub2':       'Pessimist projection based on Market Projection',
    'd2bb.roi.income':     'Total net rental income (5 years)',
    'd2bb.roi.buyback':    'Buy back value (Year 5)',
    'd2bb.roi.totalCost':  'Total cost of investment',
    'd2bb.roi.effective':  'Effective net investment cost (after rental income)',
    'd2bb.roi.sunk':       'Legal & administrative costs',
    'd2bb.roi.profit':     'Actual net profit',
    'd2bb.roi.totalROI':   'Total ROI over 5 years',
    'd2bb.roi.avgROI':     'Average annual ROI',
    'd2bb.roi.income.col': 'Rental income',
    'd2bb.roi.cum.col':    'Cumulative rental income',

    /* GV */
    'gv.kicker': 'Programme 03',
    'gv.title':  'Golden Visa <em>·</em> Investment Fund',
    'gv.sub':    "Portugal's flagship residency-by-investment programme through a regulated qualifying fund. Each participation unit corresponds to €250,000.",
    'gv.input.units':    'Number of participation units (×€250,000)',
    'gv.input.property': 'Underlying property acquisition value',
    'gv.input.main':     'Main applicants',
    'gv.input.deps':     'Dependents',
    'gv.summary.label':  'Total programme cost',
    'gv.summary.unit':   'Participation unit value',
    'gv.summary.acq':    'Property acquisition costs',
    'gv.summary.fund':   'Fund & administrative (included in participation)',
    'gv.summary.legal':  'Legal & government fees',
    'gv.summary.return': 'Projected return (5% p.a. · 5 years)',
    'gv.b.acq':          'Property acquisition costs',
    'gv.b.transfer':     'Property transfer taxes (IMT + Stamp Duty)',
    'gv.b.notary':       'Notary & registration fees',
    'gv.b.netPayable':   'Net amount payable for property acquisition',
    'gv.b.legal':        'Legal & government fees',
    'gv.b.advisory':     'Legal advisory services (entire family)',
    'gv.b.govMain':      'Government fees & permit renewals (main applicant)',
    'gv.b.govDeps':      'Government fees & permit renewals (dependents)',
    'gv.b.fund':         'Fund & administrative costs',
    'gv.b.mgmt':         'Fund management fees (1.25%)',
    'gv.b.depo':         'Depository bank fees',
    'gv.b.cmvm':         'CMVM regulatory fees',
    'gv.b.audit':        'External audit fees',
    'gv.b.sub':          'Subscription fee',
    'gv.b.sna':          'Smith & Adams administrative fees',
    'gv.b.yield':        'Projected yield distribution schedule',
    'gv.b.construction': 'Construction',
    'gv.b.annualYield':  'Annual yield distribution',
    'gv.b.deferred':     'Deferred distribution (2026 + 2027)',
    'gv.b.totalYield':   'Total yield paid',
    'gv.b.handover':     'Property handover: December 2027.',
    'gv.roi.sub':        'Projection over 5 years assuming 7% annual appreciation and 5% annual fund yield.',
    'gv.roi.rental':     'Total yield income',
    'gv.roi.cap':        'Estimated appreciation of property',
    'gv.roi.totalProfit':'Total accumulated profit',
    'gv.roi.projY5':     'Projected fund value (Year 5)',
    'gv.roi.totalCost':  'Total cost of investment',
    'gv.roi.effective':  'Effective net investment cost (after yield and appreciation)',
    'gv.roi.sale':       'Projected exit value',
    'gv.roi.comm':       'Sales commission (5%)',
    'gv.roi.net':        'Net sale value',
    'gv.roi.cgt':        'Capital gains tax (19%)',
    'gv.roi.profit':     'Actual net profit',
    'gv.roi.totalROI':   'Total ROI over 5 years',
    'gv.roi.avgROI':     'Average annual ROI',

    /* INV */
    'inv.kicker': 'Programme 04',
    'inv.title':  'Property Investment <em>·</em> Direct Acquisition',
    'inv.sub':    'For investors acquiring property in Portugal outside of a residency programme — held individually or through a company structure.',
    'inv.input.property':  'Property value',
    'inv.input.type':      'Acquisition type',
    'inv.input.individual':'Individual',
    'inv.input.company':   'Company',
    'inv.input.main':      'Main applicants',
    'inv.summary.label':   'Total programme cost',
    'inv.summary.property':'Property',
    'inv.summary.transfer':'Property transfer costs',
    'inv.summary.legal':   'Legal fees',
    'inv.b.transfer':      'Property transfer costs',
    'inv.b.is':            'Stamp Duty (IS)',
    'inv.b.notary':        'Notary & registration',
    'inv.b.legal':         'Legal fees',
    'inv.b.advisory':      'Legal advisory',
    'inv.b.incorp':        'Company incorporation',
    'inv.roi.sub':         'Projection over 5 years assuming 7% annual appreciation and 10.38% annual gross rental yield.',
    'inv.roi.rental':      'Total net rental income',
    'inv.roi.cap':         'Estimated capital appreciation',
    'inv.roi.totalProfit': 'Total accumulated profit',
    'inv.roi.projY5':      'Projected property value (Year 5)',
    'inv.roi.totalCost':   'Total cost of investment',
    'inv.roi.sale':        'Projected sale value',
    'inv.roi.comm':        'Sales commission (5%)',
    'inv.roi.gross':       'Gross sale proceeds',
    'inv.roi.cgt':         'Capital gains tax (19%)',
    'inv.roi.net':         'Net sale proceeds',
    'inv.roi.profit':      'Net profit after exit',
    'inv.roi.totalROI':    'Total ROI over 5 years',
    'inv.roi.avgROI':      'Average annual ROI',

    /* Footer */
    'footer.disclaimer': 'Figures are indicative estimates based on current Portuguese law and market assumptions. They do not constitute legal, tax or investment advice. Final values may vary depending on individual circumstances. Smith & Adams Group, Lda.',

    /* Year labels */
    'year.1': 'Year 1',
    'year.2': 'Year 2',
    'year.3': 'Year 3',
    'year.4': 'Year 4',
    'year.5': 'Year 5',
  },

  pt: {
    'hero.eyebrow': 'Calculadoras de Investimento e Residência',
    'hero.title':   'Investir em <em>Lisboa</em>.',
    'hero.lede':    'Estime o custo total, impostos, taxas e retornos projetados dos nossos quatro programas. Todos os valores são indicativos e atualizados à legislação portuguesa em vigor.',

    'tabs.d2':   'Visto D2',
    'tabs.d2bb': 'Visto D2 com Recompra',
    'tabs.gv':   'Golden Visa',
    'tabs.inv':  'Investimento Imobiliário',

    'common.assumptions': 'Os seus pressupostos',
    'common.breakdown':   'Detalhe de custos e taxas',
    'common.roi':         'Previsão de ROI',
    'common.feeCost':     'Taxa / Custo',
    'common.base':        'Base',
    'common.tax':         'Imposto',
    'common.years':       'Anos',
    'common.total':       'Total',
    'common.subtotal':    'Subtotal',
    'common.year':        'Ano',
    'common.appreciation':'Valorização',
    'common.projValue':   'Valor projetado do imóvel',
    'common.yield':       'Rendimento',
    'common.cumROI':      'ROI acumulado',
    'common.projROI':     'ROI projetado',
    'common.roiPct':      'ROI %',
    'common.yieldPct':    'Yield %',
    'common.fiveYear':    'Horizonte a 5 anos',
    'common.event':       'Evento',
    'common.amount':      'Montante',
    'common.exportPDF':   'Exportar Simulacao',
    'common.downloadMOU': 'Descarregar MOU',
    'common.legalDocs':   'Doc. Legais',
    'common.aiAnalysis':  'AI Analysis',

    /* Legal Documents */
    'legal.title':       'Documentos Legais',
    'legal.sub':         'Introduza a password de acesso para consultar os documentos legais.',
    'legal.pwPlaceholder':'Password',
    'legal.enter':       'Entrar',
    'legal.error':       'Password incorreta. Por favor, tente novamente.',
    'legal.placeholder': 'Os documentos legais deste programa serão disponibilizados aqui.',

    /* D2 */
    'd2.kicker': 'Programa 01',
    'd2.title':  'Visto D2 <em>·</em> Residência via Imóvel',
    'd2.sub':    'Programa de residência a 5 anos que combina a aquisição de um imóvel em Portugal com o visto D2 para o titular e a sua família.',
    'd2.input.property': 'Valor do investimento imobiliário',
    'd2.input.main':     'Requerentes principais',
    'd2.input.deps':     'Dependentes',
    'd2.input.note':     'O programa base cobre uma família de 4. Taxas adicionais aplicam-se acima desse número.',
    'd2.summary.label':  'Custo total estimado · programa a 5 anos',
    'd2.summary.property':'Imóvel',
    'd2.summary.acq':    'Custos de aquisição do imóvel',
    'd2.summary.legal':  'Honorários legais e de imigração',
    'd2.summary.other':  'Administrativos e outros',
    'd2.b.acq':          'Custos de aquisição do imóvel',
    'd2.b.imt':          'IMT (Imposto Municipal sobre Transmissões)',
    'd2.b.is':           'Imposto do Selo (IS)',
    'd2.b.notary':       'Notário e registo',
    'd2.b.legal':        'Honorários legais e de imigração',
    'd2.b.advisory':     'Acompanhamento legal (5 anos · família de 4)',
    'd2.b.visa':         'Pedido e renovações do visto D2',
    'd2.b.other':        'Custos administrativos e outros',
    'd2.b.admin':        'Honorários administrativos (5 anos)',
    'd2.b.ins':          'Seguro de saúde',
    'd2.roi.sub':        '7% de rendimento líquido · 5% de valorização do capital',
    'd2.roi.sub2':       'Projeção pessimista baseada na projeção de mercado',
    'd2.roi.rental':     'Total de rendas líquidas',
    'd2.roi.cap':        'Valorização estimada do imóvel',
    'd2.roi.totalProfit':'Lucro acumulado total',
    'd2.roi.projY5':     'Valor projetado do imóvel (Ano 5)',
    'd2.roi.totalCost':  'Custo total do investimento',
    'd2.roi.effective':  'Custo líquido efetivo (após yield e valorização)',
    'd2.roi.sale':       'Valor de venda projetado',
    'd2.roi.comm':       'Comissão de venda (5%)',
    'd2.roi.net':        'Valor líquido de venda',
    'd2.roi.cgt':        'IRS sobre mais-valias (19%)',
    'd2.roi.profit':     'Lucro líquido efetivo',
    'd2.roi.totalROI':   'ROI total a 5 anos',
    'd2.roi.avgROI':     'ROI médio anual',

    /* D2 COM RECOMPRA */
    'd2bb.kicker': 'Programa 02',
    'd2bb.title':  'Visto D2 <em>·</em> com Recompra',
    'd2bb.sub':    'Programa de residência a 5 anos com recompra garantida do imóvel pelo preço de compra original, sem custos de aquisição para o investidor.',
    'd2bb.input.property': 'Valor de investimento no imóvel',
    'd2bb.input.main':     'Requerentes principais',
    'd2bb.input.deps':     'Dependentes',
    'd2bb.input.note':     'O programa base cobre uma família de 4. Acima disso aplicam-se taxas adicionais.',
    'd2bb.summary.label':  'Custo total estimado · programa de 5 anos',
    'd2bb.summary.property':'Imóvel',
    'd2bb.summary.legal':  'Taxas legais e de imigração',
    'd2bb.summary.other':  'Administrativos e outros',
    'd2bb.summary.note':   'Na estrutura de recompra não se aplicam custos de aquisição (IMT, Imposto do Selo ou notário).',
    'd2bb.b.legal':        'Taxas legais e de imigração',
    'd2bb.b.advisory':     'Serviços de assessoria jurídica (5A · família de 4)',
    'd2bb.b.visa':         'Pedido de visto D2 e renovações',
    'd2bb.b.other':        'Custos administrativos e outros',
    'd2bb.b.admin':        'Taxas administrativas (5 anos)',
    'd2bb.b.ins':          'Cobertura de seguro',
    'd2bb.roi.sub':        '7% de rendimento de arrendamento por ano',
    'd2bb.roi.sub2':       'Projeção pessimista baseada na projeção de mercado',
    'd2bb.roi.income':     'Rendimento líquido total (5 anos)',
    'd2bb.roi.buyback':    'Valor de recompra (Ano 5)',
    'd2bb.roi.totalCost':  'Custo total do investimento',
    'd2bb.roi.effective':  'Custo líquido efetivo (após rendimento)',
    'd2bb.roi.sunk':       'Custos legais e administrativos',
    'd2bb.roi.profit':     'Lucro líquido efetivo',
    'd2bb.roi.totalROI':   'ROI total a 5 anos',
    'd2bb.roi.avgROI':     'ROI médio anual',
    'd2bb.roi.income.col': 'Rendimento',
    'd2bb.roi.cum.col':    'Rendimento acumulado',

    /* GV */
    'gv.kicker': 'Programa 03',
    'gv.title':  'Golden Visa <em>·</em> Fundo de Investimento',
    'gv.sub':    'O principal programa de residência por investimento em Portugal através de um fundo qualificado regulado. Cada unidade de participação corresponde a 250.000 €.',
    'gv.input.units':    'Número de unidades de participação (×250.000 €)',
    'gv.input.property': 'Valor do imóvel subjacente',
    'gv.input.main':     'Requerentes principais',
    'gv.input.deps':     'Dependentes',
    'gv.summary.label':  'Custo total do programa',
    'gv.summary.unit':   'Valor da unidade de participação',
    'gv.summary.acq':    'Custos de aquisição do imóvel',
    'gv.summary.fund':   'Fundo e administrativos (incluído na participação)',
    'gv.summary.legal':  'Taxas legais e governamentais',
    'gv.summary.return': 'Retorno projetado (5% a.a. · 5 anos)',
    'gv.b.acq':          'Custos de aquisição do imóvel',
    'gv.b.transfer':     'IMT + Imposto do Selo',
    'gv.b.notary':       'Notário e registo',
    'gv.b.netPayable':   'Valor líquido a pagar pelo imóvel',
    'gv.b.legal':        'Taxas legais e governamentais',
    'gv.b.advisory':     'Acompanhamento legal (toda a família)',
    'gv.b.govMain':      'Taxas e renovações (requerente principal)',
    'gv.b.govDeps':      'Taxas e renovações (dependentes)',
    'gv.b.fund':         'Custos do fundo e administrativos',
    'gv.b.mgmt':         'Comissão de gestão do fundo (1,25%)',
    'gv.b.depo':         'Comissão do banco depositário',
    'gv.b.cmvm':         'Taxas reguladoras CMVM',
    'gv.b.audit':        'Auditoria externa',
    'gv.b.sub':          'Comissão de subscrição',
    'gv.b.sna':          'Honorários Smith & Adams',
    'gv.b.yield':        'Cronograma de distribuição de yields',
    'gv.b.construction': 'Construção',
    'gv.b.annualYield':  'Distribuição anual de yield',
    'gv.b.deferred':     'Distribuição diferida (2026 + 2027)',
    'gv.b.totalYield':   'Total de yields pagos',
    'gv.b.handover':     'Entrega do imóvel: dezembro de 2027.',
    'gv.roi.sub':        'Projeção a 5 anos assumindo valorização anual de 7% e yield anual do fundo de 5%.',
    'gv.roi.rental':     'Total de rendimento de yields',
    'gv.roi.cap':        'Valorização estimada do imóvel',
    'gv.roi.totalProfit':'Lucro acumulado total',
    'gv.roi.projY5':     'Valor projetado do fundo (Ano 5)',
    'gv.roi.totalCost':  'Custo total do investimento',
    'gv.roi.effective':  'Custo líquido efetivo (após yield e valorização)',
    'gv.roi.sale':       'Valor de saída projetado',
    'gv.roi.comm':       'Comissão de venda (5%)',
    'gv.roi.net':        'Valor líquido de venda',
    'gv.roi.cgt':        'IRS sobre mais-valias (19%)',
    'gv.roi.profit':     'Lucro líquido efetivo',
    'gv.roi.totalROI':   'ROI total a 5 anos',
    'gv.roi.avgROI':     'ROI médio anual',

    /* INV */
    'inv.kicker': 'Programa 04',
    'inv.title':  'Investimento Imobiliário <em>·</em> Aquisição Direta',
    'inv.sub':    'Para investidores que adquirem imóveis em Portugal fora de um programa de residência — em nome individual ou através de uma empresa.',
    'inv.input.property':  'Valor do imóvel',
    'inv.input.type':      'Tipo de aquisição',
    'inv.input.individual':'Nome individual',
    'inv.input.company':   'Empresa',
    'inv.input.main':      'Requerentes principais',
    'inv.summary.label':   'Custo total do programa',
    'inv.summary.property':'Imóvel',
    'inv.summary.transfer':'Custos de transmissão',
    'inv.summary.legal':   'Honorários legais',
    'inv.b.transfer':      'Custos de transmissão do imóvel',
    'inv.b.is':            'Imposto do Selo (IS)',
    'inv.b.notary':        'Notário e registo',
    'inv.b.legal':         'Honorários legais',
    'inv.b.advisory':      'Acompanhamento legal',
    'inv.b.incorp':        'Constituição de empresa',
    'inv.roi.sub':         'Projeção a 5 anos com valorização anual de 7% e yield bruto anual de 10,38%.',
    'inv.roi.rental':      'Rendimento líquido total de arrendamento',
    'inv.roi.cap':         'Valorização estimada do imóvel',
    'inv.roi.totalProfit': 'Lucro acumulado total',
    'inv.roi.projY5':      'Valor projetado do imóvel (Ano 5)',
    'inv.roi.totalCost':   'Custo total do investimento',
    'inv.roi.sale':        'Valor de venda projetado',
    'inv.roi.comm':        'Comissão de venda (5%)',
    'inv.roi.gross':       'Produto bruto de venda',
    'inv.roi.cgt':         'Imposto sobre mais-valias (19%)',
    'inv.roi.net':         'Produto líquido de venda',
    'inv.roi.profit':      'Lucro líquido após saída',
    'inv.roi.totalROI':    'ROI total a 5 anos',
    'inv.roi.avgROI':      'ROI médio anual',

    /* Footer */
    'footer.disclaimer': 'Os valores apresentados são estimativas indicativas baseadas na legislação portuguesa em vigor e em pressupostos de mercado. Não constituem aconselhamento legal, fiscal ou de investimento. Os valores finais podem variar consoante as circunstâncias individuais. Smith & Adams Group, Lda.',

    /* Year labels */
    'year.1': 'Ano 1',
    'year.2': 'Ano 2',
    'year.3': 'Ano 3',
    'year.4': 'Ano 4',
    'year.5': 'Ano 5',
  },
};

let currentLang = 'en';

function getYearLabel(n) {
  return i18n[currentLang][`year.${n}`] || `Year ${n}`;
}

function applyLang(lang) {
  currentLang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang);
  document.title = lang === 'pt'
    ? 'Smith & Adams · Calculadoras de Investimento'
    : 'Smith & Adams · Investment Calculators';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key   = el.getAttribute('data-i18n');
    const value = i18n[lang][key];
    if (value !== undefined) {
      if (value.includes('<em>') || value.includes('&amp;')) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key   = el.getAttribute('data-i18n-placeholder');
    const value = i18n[lang][key];
    if (value !== undefined) el.placeholder = value;
  });

  document.querySelectorAll('[data-set-lang]').forEach((btn) => {
    const isActive = btn.getAttribute('data-set-lang') === lang;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  recalcAll();
}

/* ============================================================
   TABS
   ============================================================ */
function activateTab(name) {
  document.querySelectorAll('.tab').forEach((t) => {
    const active = t.dataset.tab === name;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.calc').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
  /* Não existe template de MOU para o D2 with Buy Back — o MOU do D2 inclui
     custos de aquisição (IMT/IS/notário) que esta estrutura não tem, por isso
     o botão é escondido em vez de gerar um documento incorrecto. */
  const mouBtn = document.getElementById('btn-mou');
  if (mouBtn) mouBtn.style.display = name === 'd2bb' ? 'none' : '';
  try { localStorage.setItem('sna_tab', name); } catch (_) {}
}

/* ============================================================
   RECALC
   ============================================================ */
function recalcAll() {
  calcD2();
  calcD2BB();
  calcGV();
  calcInv();
}

/* ============================================================
   GOOGLE SHEETS LIVE CONFIG
   Faz fetch do Apps Script e funde os valores no CONFIG.
   Fallback silencioso para os defaults se offline ou URL vazio.
   ============================================================ */
async function fetchConfig(url) {
  if (!url) return;
  try {
    const res  = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.shared) Object.assign(CONFIG.shared, data.shared);
    if (data.d2) {
      /* appreciationRate e rentalYield do D2 são fixos no código
         (5% capital growth · 7% net income). A Sheet ainda serve os
         valores antigos (7% / 10.38%), por isso são descartados aqui. */
      const d2Live = Object.assign({}, data.d2);
      delete d2Live.appreciationRate;
      delete d2Live.rentalYield;
      Object.assign(CONFIG.d2, d2Live);
    }
    if (data.gv)     Object.assign(CONFIG.gv,     data.gv);
    if (data.inv)    Object.assign(CONFIG.inv,    data.inv);

    // Actualiza input GV se o imóvel subjacente mudou na sheet
    const gvProp = document.getElementById('gv-property');
    if (gvProp && data.gv && data.gv.defaultProperty !== undefined) {
      gvProp.value = data.gv.defaultProperty;
    }

    console.info('[S&A] Config live carregada:', new Date().toLocaleTimeString());
  } catch (err) {
    console.warn('[S&A] Config live indisponível — a usar defaults.', err.message);
  }
}

/* ============================================================
   INITIALISATION
   ============================================================ */
async function init() {
  // Buscar valores live da Google Sheet (não bloqueia; usa defaults se falhar)
  await fetchConfig(SCRIPT_URL);

  // Wire inputs
  document.querySelectorAll('input').forEach((el) => {
    el.addEventListener('input', recalcAll);
    el.addEventListener('change', recalcAll);
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });

  // Language switch
  document.querySelectorAll('[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-set-lang');
      applyLang(lang);
      try { localStorage.setItem('sna_lang', lang); } catch (_) {}
    });
  });

  // PDF export
  const pdfBtn = document.getElementById('btn-pdf');
  if (pdfBtn) pdfBtn.addEventListener('click', exportPDF);

  // MOU download - context aware
  const mouBtn = document.getElementById('btn-mou');
  if (mouBtn) mouBtn.addEventListener('click', () => {
    const activeTab = document.querySelector('.tab.is-active')?.dataset?.tab || 'inv';
    if (activeTab === 'd2') generateD2MOU();
    else if (activeTab === 'gv') generateGVMOU();
    else generateMOU();
  });

  // MOU form modal
  initMOUModal();
  initGVMOUModal();

  // Legal documents
  initLegalDocs();

  // AI Analysis
  initAIAnalysis();

  // Restore preferences
  try {
    const savedLang = localStorage.getItem('sna_lang');
    if (savedLang && i18n[savedLang]) applyLang(savedLang);
    const savedTab = localStorage.getItem('sna_tab');
    if (savedTab) activateTab(savedTab);
  } catch (_) {}

  // First render
  recalcAll();
}

document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   PDF EXPORT
   ============================================================ */
function exportPDF() {
  const btn   = document.getElementById('btn-pdf');
  const label = btn ? btn.querySelector('.fab-label') : null;
  const orig  = label ? label.textContent : '';

  if (label) label.textContent = currentLang === 'pt' ? 'A preparar…' : 'Preparing…';
  if (btn)   btn.disabled = true;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.print();
    if (label) label.textContent = orig;
    if (btn)   btn.disabled = false;
  }));
}

/* ============================================================
   MOU — MODAL + PDF GENERATION
   ============================================================ */

let mouContext = 'inv';

function generateMOU() {
  /* Open the form modal, pre-fill from calculator */
  mouContext = 'inv';
  const titleEl = document.querySelector('#mou-overlay .mou-modal-title');
  if (titleEl) titleEl.textContent = 'Download MOU';

  const property = num('inv-property');
  const el = document.getElementById('mou-price');
  if (el) el.value = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(property);

  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '/');
  const dateEl = document.getElementById('mou-date');
  if (dateEl && !dateEl.value) dateEl.value = today;

  const overlay = document.getElementById('mou-overlay');
  if (overlay) {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }
}

function closeMOUModal() {
  const overlay = document.getElementById('mou-overlay');
  if (overlay) {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }
}

function applyDateMask(el) {
  if (!el) return;
  el.setAttribute('maxlength', '10');
  if (!el.placeholder) el.placeholder = 'DD/MM/YYYY';
  el.addEventListener('input', function (e) {
    // strip non-digits, cap at 8 digits (DDMMYYYY)
    let digits = this.value.replace(/\D/g, '').slice(0, 8);
    // rebuild with slashes
    if (digits.length > 4) {
      this.value = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    } else if (digits.length > 2) {
      this.value = digits.slice(0, 2) + '/' + digits.slice(2);
    } else {
      this.value = digits;
    }
  });
}

function initMOUModal() {
  const closeBtn = document.getElementById('btn-close-mou');
  if (closeBtn) closeBtn.addEventListener('click', closeMOUModal);

  const overlay = document.getElementById('mou-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMOUModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('mou-overlay');
    if (e.key === 'Escape' && overlay && !overlay.hidden) closeMOUModal();
  });

  /* date masks */
  ['mou-date', 'mou-purchase-date', 'mou-pp1-date', 'mou-pp2-date', 'mou-pp3-date', 'mou-pp4-date', 'mou-pp5-date']
    .forEach(id => applyDateMask(document.getElementById(id)));

  const genBtn = document.getElementById('btn-generate-mou');
  if (genBtn) genBtn.addEventListener('click', () => {
    const data = {
      date:            document.getElementById('mou-date')?.value || '',
      buyerName:       document.getElementById('mou-buyer-name')?.value || '',
      passport:        document.getElementById('mou-passport')?.value || '',
      nationality:     document.getElementById('mou-nationality')?.value || '',
      unitNumber:      document.getElementById('mou-unit')?.value || '',
      projectType:     document.getElementById('mou-project-type')?.value || '',
      purchaseDate:    document.getElementById('mou-purchase-date')?.value || '',
      developerDetails:document.getElementById('mou-developer')?.value || '',
      pp1desc:         document.getElementById('mou-pp1-desc')?.value || '',
      pp1date:         document.getElementById('mou-pp1-date')?.value || '',
      pp1amount:       document.getElementById('mou-pp1-amount')?.value || '',
      pp2desc:         document.getElementById('mou-pp2-desc')?.value || '',
      pp2date:         document.getElementById('mou-pp2-date')?.value || '',
      pp2amount:       document.getElementById('mou-pp2-amount')?.value || '',
      pp3desc:         document.getElementById('mou-pp3-desc')?.value || '',
      pp3date:         document.getElementById('mou-pp3-date')?.value || '',
      pp3amount:       document.getElementById('mou-pp3-amount')?.value || '',
      pp4desc:         document.getElementById('mou-pp4-desc')?.value || '',
      pp4date:         document.getElementById('mou-pp4-date')?.value || '',
      pp4amount:       document.getElementById('mou-pp4-amount')?.value || '',
      pp5desc:         document.getElementById('mou-pp5-desc')?.value || '',
      pp5date:         document.getElementById('mou-pp5-date')?.value || '',
      pp5amount:       document.getElementById('mou-pp5-amount')?.value || '',
    };
    if (mouContext === 'd2') buildD2MouPdf(data);
    else buildMOUPdf(data);
    closeMOUModal();
  });
}

const MOU_LOGO_B64 = 'iVBORw0KGgoAAAANSUhEUgAACbEAAAOCCAYAAABDYg3eAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nOzd63kUR9YA4FP7fP+tjWCHCBZH4CGCFRF4iACIABEBOALkCGAjQBsBcgSMI0COoL4fXbKFrEtfqi8z/b7PowcBPTXVc+muPn3qVAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgIPwXDXspNFZf18sAAAAASUVORK5CYII=';

function buildMOUPdf(data) {
  /* ── calculator values for costs table ── */
  const property  = num('inv-property');
  const type      = document.querySelector('input[name="inv-type"]:checked')?.value || 'Individual';
  const isCompany = type === 'Company';
  const vat       = CONFIG.shared.vatRate;
  const cfg       = CONFIG.inv;

  const imtBase       = property * cfg.imtRate;
  const isBase        = property * cfg.isRate;
  const notaryBase    = cfg.notaryBase;
  const notary        = notaryBase * (1 + vat);
  const transferTotal = imtBase + isBase + notary;

  const advisoryBase  = cfg.legalAdvisory;
  const advisory      = advisoryBase * (1 + vat);
  const incorpBase    = cfg.companyIncorp;
  const incorp        = isCompany ? incorpBase * (1 + vat) : 0;
  const legalTotal    = advisory + incorp;
  const totalCosts    = transferTotal + legalTotal;

  /* ── jsPDF ── */
  const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!JsPDF) { console.error('[S&A] jsPDF not available'); return; }

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W   = 210;
  const M   = 18;
  const cW  = W - M * 2;   // 174 mm
  const HDR = 38;
  const FTR = 287;
  const BOD = HDR + 7;

  /* colours */
  const green  = [61,  79,  69];
  const cream  = [250, 246, 238];
  const sand   = [242, 237, 227];
  const sandL  = [234, 226, 210];
  const linec  = [216, 208, 194];
  const muted  = [138, 133, 120];
  const ink    = [26,  26,  26];
  const accent = [92,  112, 100];

  const fg = (...a) => doc.setTextColor(...a);
  const bg = (...a) => doc.setFillColor(...a);
  const ln = (...a) => doc.setDrawColor(...a);

  let pageNum = 0;

  /* ── shared: header ── */
  function drawHeader() {
    bg(...green); doc.rect(0, 0, W, HDR, 'F');
    // logo 2481x898 px — aspect 2.763:1, transparent bg
    const logoW = 65, logoH = logoW * 898 / 2481;  // ≈ 23.6 mm tall
    const logoX = (W - logoW) / 2;
    const logoY = (HDR - logoH) / 2 - 3;           // centre, shifted slightly up
    doc.addImage('data:image/png;base64,' + MOU_LOGO_B64, 'PNG', logoX, logoY, logoW, logoH);
    fg(...cream);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('MEMORANDUM OF UNDERSTANDING - PROPERTY PURCHASE', W / 2, HDR - 3, { align: 'center' });
  }

  /* ── shared: footer ── */
  function drawFooter(n) {
    ln(...linec); doc.setLineWidth(0.25);
    doc.line(M, FTR, W - M, FTR);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('Smith & Adams Group - MOU - Property Purchase', M, FTR + 4.5);
    doc.text('Page ' + n, W - M, FTR + 4.5, { align: 'right' });
  }

  /* ── shared: green band ── */
  function drawBand(y, text) {
    bg(...green); doc.rect(M, y, cW, 7.5, 'F');
    fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(text, M + 3, y + 5.5);
    return y + 7.5;
  }

  /* ── shared: article heading ── */
  function drawArticle(y, text) {
    fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(text, M, y);
    return y + 5.5;
  }

  /* ── shared: body paragraph (returns new y) ── */
  function para(y, text, sz) {
    sz = sz || 8.5;
    fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(sz);
    const lines = doc.splitTextToSize(text, cW);
    doc.text(lines, M, y);
    return y + lines.length * (sz * 0.352778 * 1.42) + 1.5;
  }

  /* ── shared: muted paragraph ── */
  function mutedPara(y, text, sz) {
    sz = sz || 7;
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(sz);
    const lines = doc.splitTextToSize(text, cW);
    doc.text(lines, M, y);
    return y + lines.length * (sz * 0.352778 * 1.42) + 1;
  }

  /* ────────────────────────────────────
     PAGE 1
  ──────────────────────────────────── */
  pageNum = 1;
  drawHeader();
  drawFooter(pageNum);

  let y = BOD + 4;

  /* Date */
  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('Lisbon, ' + (data.date || ''), M, y);
  y += 8;

  /* BETWEEN */
  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('BETWEEN', M, y);
  y += 6;

  /* Parties table */
  const half = cW / 2;
  // header row
  bg(...green); doc.rect(M, y, cW, 7, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('THE SELLER', M + 3,        y + 5);
  doc.text('THE BUYER',  M + half + 3, y + 5);
  ln(...linec); doc.setLineWidth(0.2);
  doc.line(M + half, y, M + half, y + 7);
  y += 7;

  // content row
  const sellerLines = [
    'MARGEM VIGILANTE INVESTIMENTOS',
    'IMOBILIARIOS LDA',
    'Tax ID: 517878267',
    'Av. da Liberdade 258, 9',
    '1250-149 Lisboa, Portugal',
  ];
  const buyerLines = [
    data.buyerName   || '___________________',
    'Passport: ' + (data.passport     || '___________________'),
    'Nationality: '  + (data.nationality  || '___________________'),
  ];
  const pRowH = Math.max(sellerLines.length, buyerLines.length) * 4.8 + 6;
  bg(...cream); doc.rect(M, y, cW, pRowH, 'F');
  ln(...linec); doc.setLineWidth(0.2);
  doc.rect(M, y, cW, pRowH, 'S');
  doc.line(M + half, y, M + half, y + pRowH);
  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(sellerLines, M + 3,        y + 5);
  doc.text(buyerLines,  M + half + 3, y + 5);
  y += pRowH + 7;

  /* Preamble */
  y = para(y,
    'The parties identified above enter into this Memorandum of Understanding (MOU) regarding ' +
    'the purchase and sale of the property described below, under the terms and conditions ' +
    'set forth in this document.', 8.5);
  y += 3;

  /* Property details band */
  y = drawBand(y, 'PROPERTY DETAILS');
  y += 2;

  /* Property details table */
  const pdLW = cW * 0.38;
  const pdRW = cW - pdLW;

  const pdRow = (label, value, alt) => {
    const rH = 8;
    bg(...(alt ? sand : [255, 255, 255]));
    doc.rect(M, y, cW, rH, 'F');
    ln(...linec); doc.setLineWidth(0.2);
    doc.rect(M, y, cW, rH, 'S');
    doc.line(M + pdLW, y, M + pdLW, y + rH);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(label, M + 3, y + 5);
    fg(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    const vLines = doc.splitTextToSize(value || '___', pdRW - 5);
    doc.text(vLines, M + pdLW + 3, y + 5);
    y += rH;
  };

  pdRow('Unit Number',     data.unitNumber      || '___',                     false);
  pdRow('Purchase Price',  'EUR ' + fmtEUR(property),                         true);
  pdRow('Project Type',    data.projectType     || '___',                     false);
  pdRow('Payment Plan',    'As per schedule - see Payment Plan section',       true);
  pdRow('Purchase Date',   data.purchaseDate    || '___',                     false);
  pdRow('Developer',       data.developerDetails || 'Margem Vigilante Investimentos Imobiliarios LDA', true);

  /* ────────────────────────────────────
     PAGE 2
  ──────────────────────────────────── */
  doc.addPage(); pageNum = 2;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = drawBand(y, 'PAYMENT TERMS');
  y += 5;

  y = drawArticle(y, 'Article 1 - Rights and Obligations');
  y = para(y,
    'The Buyer will assume all rights and obligations to purchase the referred Property from ' +
    'the date of signature and transfer of the amount agreed.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 2 - Delivery of Property');
  y = para(y,
    'Should it not be agreed otherwise, the Property will be delivered upon completion, free ' +
    'from charges and encumbrances and tenants.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 3 - Reservation Fee');
  y = para(y,
    'It is understood between Seller and Buyer that for this MOU to be valid and legally ' +
    'binding, the Buyer shall pay to the Seller the amount of EUR 20,000 (twenty thousand ' +
    'euros) as an initial reservation fee on the date of signing.', 8.5);
  y = para(y, 'Payment details are mentioned below:', 8.5);
  y += 1;

  /* Bank details box */
  bg(...cream); ln(...linec); doc.setLineWidth(0.3);
  doc.rect(M, y, cW, 24, 'FD');
  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('NOVO BANCO', M + 4, y + 7);
  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('IBAN: PT 50 0007 0000 0069 9454 9732 3', M + 4, y + 13);
  doc.text('SWIFT: BESCPTPL',                        M + 4, y + 19);
  y += 30;

  y = drawArticle(y, 'Article 4 - Preliminary Agreement (CPCV)');
  y = para(y,
    '4.1. The parties agree to execute a Promissory Purchase and Sale Agreement ' +
    '(Contrato Promessa de Compra e Venda - CPCV) within 30 (thirty) days from the date of ' +
    'this MOU.', 8.5);
  y = para(y,
    '4.2. The CPCV will set out the full terms and conditions of the sale, including but not ' +
    'limited to the payment schedule, technical specifications, and completion date.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 5 - Construction Delay, Grace Period, Force Majeure and Buy-Back Right');
  y = para(y,
    'In the event of a construction delay, the Seller shall benefit from a grace period of ' +
    'ninety (90) calendar days after the estimated completion date, during which no penalties, ' +
    'compensation, or liabilities shall apply.', 8.5);
  y = para(y,
    'Should the construction delay exceed the ninety (90) day grace period, the Seller shall ' +
    'pay the Buyer compensation in the amount of EUR 600 (six hundred euros) per month, ' +
    'calculated on a pro-rata daily basis, for a maximum period of seven (7) months.', 8.5);

  /* ────────────────────────────────────
     PAGE 3
  ──────────────────────────────────── */
  doc.addPage(); pageNum = 3;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = para(y,
    'If the delay exceeds seven (7) months after the expiration of the grace period, the ' +
    'Buyer shall have the right to resell the Property back to the Seller. In such case, ' +
    'the Seller shall be obligated to repurchase the Property from the Buyer, reimbursing ' +
    'the full purchase price paid by the Buyer together with all documented acquisition-related ' +
    'costs reasonably incurred by the Buyer up to that date, within sixty (60) days from ' +
    'receipt of the Buyer\'s written notice exercising such right.', 8.5);
  y = para(y,
    'Upon the Buyer\'s decision to trigger the buy-back mechanism, any compensation payments ' +
    'under this clause shall immediately cease to accrue. All yields received by the Buyer, ' +
    'as well as any compensation amounts already paid under this clause, shall remain in the ' +
    'possession of the Buyer, with no obligation of refund to the Seller.', 8.5);
  y = para(y,
    'The Seller shall not be held liable for any construction delays, non-performance, or ' +
    'failure to comply with the estimated completion timeline arising from events of Force ' +
    'Majeure. For the purposes of this Agreement, "Force Majeure" shall include, but not be ' +
    'limited to, acts of God, natural disasters, war, terrorism, civil unrest, governmental ' +
    'actions or restrictions, changes in applicable laws or regulations, labor strikes, ' +
    'shortages of materials, supply chain disruptions, pandemics, banking disruptions, delays ' +
    'caused by public authorities, utility failures, or any other circumstances beyond the ' +
    'reasonable control of the Seller.', 8.5);
  y = para(y,
    'In the event of a Force Majeure occurrence materially affecting the construction ' +
    'timeline, the estimated completion date shall be automatically extended for the duration ' +
    'of such event and its direct consequences.', 8.5);
  y += 4;

  y = drawArticle(y, 'Article 6 - Governing Law and Jurisdiction');
  y = para(y,
    'This Memorandum of Understanding (MOU) and any dispute, controversy, claim, or ' +
    'obligation arising out of or in connection with it, including its validity, ' +
    'interpretation, execution, breach, or termination, shall be governed by and construed ' +
    'in accordance with the laws of the Portuguese Republic.', 8.5);
  y = para(y,
    'The Parties agree that any disputes arising from or related to this Agreement shall be ' +
    'submitted to the exclusive jurisdiction of the courts of Lisbon, Portugal, expressly ' +
    'waiving any other jurisdiction that may otherwise apply.', 8.5);
  y = para(y,
    'Prior to initiating any judicial proceedings, the Parties shall use their best efforts ' +
    'to resolve any dispute amicably and in good faith within a period of thirty (30) days ' +
    'from written notification of such dispute by one Party to the other.', 8.5);

  /* ────────────────────────────────────
     PAGE 4
  ──────────────────────────────────── */
  doc.addPage(); pageNum = 4;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  /* Payment Plan table */
  y = drawBand(y, 'PAYMENT PLAN');
  y += 2;

  const ppLW = cW * 0.55;

  // header
  bg(...green); doc.rect(M, y, cW, 7, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('DESCRIPTION / DUE DATE', M + 3,     y + 5);
  doc.text('AMOUNT (EUR)',            W - M - 3, y + 5, { align: 'right' });
  ln(...linec); doc.setLineWidth(0.2);
  doc.line(M + ppLW, y, M + ppLW, y + 7);
  y += 7;

  const ppRow = (desc, date, amount, alt) => {
    const rH = 11;
    bg(...(alt ? sand : [255, 255, 255]));
    doc.rect(M, y, cW, rH, 'F');
    ln(...linec); doc.setLineWidth(0.2);
    doc.rect(M, y, cW, rH, 'S');
    doc.line(M + ppLW, y, M + ppLW, y + rH);
    fg(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(desc, M + 3, y + 5);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    if (date) doc.text('Due: ' + date, M + 3, y + 9.5);
    fg(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(amount || '___', W - M - 3, y + 7, { align: 'right' });
    y += rH;
  };

  ppRow(data.pp1desc, data.pp1date, data.pp1amount, false);
  ppRow(data.pp2desc, data.pp2date, data.pp2amount, true);
  ppRow(data.pp3desc, data.pp3date, data.pp3amount, false);
  if (data.pp4desc || data.pp4date || data.pp4amount)
    ppRow(data.pp4desc, data.pp4date, data.pp4amount, true);
  if (data.pp5desc || data.pp5date || data.pp5amount)
    ppRow(data.pp5desc, data.pp5date, data.pp5amount, false);

  y += 10;

  /* Costs table */
  y = drawBand(y, 'TRANSACTION COSTS (BUYER REFERENCE)');
  y += 2;

  const rH = 7;
  const c1 = M;
  const c2 = M + cW * 0.50;
  const c3 = M + cW * 0.66;
  const c4 = W - M;

  bg(...green); doc.rect(c1, y, cW, rH, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('DESCRIPTION', c1 + 3, y + 5);
  doc.text('BASE',         c2 - 2, y + 5, { align: 'right' });
  doc.text('TAX',          c3 - 2, y + 5, { align: 'right' });
  doc.text('TOTAL',        c4 - 2, y + 5, { align: 'right' });
  y += rH;

  const cSec = (lbl) => {
    bg(...sand); doc.rect(c1, y, cW, 6, 'F');
    fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text(lbl, c1 + 3, y + 4.5);
    y += 6;
  };

  const cRow = (desc, base, tax, total, sub) => {
    bg(...(sub ? sandL : [255, 255, 255]));
    doc.rect(c1, y, cW, rH, 'F');
    fg(...ink); doc.setFont('helvetica', sub ? 'bold' : 'normal'); doc.setFontSize(8.5);
    doc.text(desc, c1 + 3, y + 5);
    if (base) {
      fg(...muted); doc.setFont('helvetica', 'normal');
      doc.text(base,  c2 - 2, y + 5, { align: 'right' });
      doc.text(tax,   c3 - 2, y + 5, { align: 'right' });
    }
    fg(...ink); doc.setFont('helvetica', sub ? 'bold' : 'normal');
    doc.text(total, c4 - 2, y + 5, { align: 'right' });
    ln(...linec); doc.setLineWidth(0.2);
    doc.line(c1, y + rH, c4, y + rH);
    y += rH;
  };

  cSec('PROPERTY TRANSFER COSTS');
  cRow('IMT - Property Transfer Tax',   fmtEUR(imtBase),    '6.5%', fmtEUR(imtBase));
  cRow('Stamp Duty (IS)',               fmtEUR(isBase),     '0.8%', fmtEUR(isBase));
  cRow('Notary and Registration Fees',  fmtEUR(notaryBase), '23%',  fmtEUR(notary));
  cRow('Transfer Subtotal',             '',                 '',     fmtEUR(transferTotal), true);

  cSec('LEGAL FEES');
  cRow('Legal advisory',                fmtEUR(advisoryBase), '23%', fmtEUR(advisory));
  if (isCompany) cRow('Company incorporation', fmtEUR(incorpBase), '23%', fmtEUR(incorp));
  cRow('Legal Subtotal',                '',                   '',   fmtEUR(legalTotal), true);

  bg(...green); doc.rect(c1, y, cW, rH + 2, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Total Programme Cost',          c1 + 3, y + 6);
  doc.text(fmtEUR(property + totalCosts),   c4 - 2, y + 6, { align: 'right' });

  /* ────────────────────────────────────
     PAGE 5
  ──────────────────────────────────── */
  doc.addPage(); pageNum = 5;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = drawBand(y, 'SIGNATURES');
  y += 8;

  /* Signatures box */
  const sigLW = cW / 2;
  const sigH  = 46;

  bg(...cream); ln(...linec); doc.setLineWidth(0.3);
  doc.rect(M, y, cW, sigH, 'FD');
  doc.line(M + sigLW, y, M + sigLW, y + sigH);

  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('THE BUYER',  M + 3,          y + 7);
  doc.text('THE SELLER', M + sigLW + 3,  y + 7);

  ln(...ink); doc.setLineWidth(0.4);
  doc.line(M + 3,         y + 30, M + sigLW - 3, y + 30);
  doc.line(M + sigLW + 3, y + 30, W - M - 3,     y + 30);

  fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Signature',   M + 3,         y + 35);
  doc.text('Signature',   M + sigLW + 3, y + 35);

  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(data.buyerName || '___________________', M + 3, y + 40);
  fg(...muted); doc.setFontSize(7.5);
  doc.text('MARGEM VIGILANTE INVESTIMENTOS', M + sigLW + 3, y + 40);
  doc.text('IMOBILIARIOS LDA',               M + sigLW + 3, y + 44);

  y += sigH + 8;

  /* Date lines */
  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Date: _____ / _____ / _______', M,           y);
  doc.text('Date: _____ / _____ / _______', M + sigLW,   y);
  y += 14;

  /* Disclaimer */
  ln(...linec); doc.setLineWidth(0.25);
  doc.line(M, y, W - M, y);
  y += 5;
  mutedPara(y,
    'This Memorandum of Understanding is indicative and does not constitute a legally ' +
    'binding contract. All values are subject to confirmation upon formal agreement. ' +
    'Smith & Adams Group - geral@smithandadams.com', 7);

  /* ── SAVE ── */
  doc.save('Smith-Adams-MOU-Property-Purchase.pdf');
}


/* ============================================================
   D2 MOU GENERATOR
   ============================================================ */

function generateD2MOU() {
  mouContext = 'd2';
  const titleEl = document.querySelector('#mou-overlay .mou-modal-title');
  if (titleEl) titleEl.textContent = 'Download MOU - D2 Visa';
  const property = num('d2-property');
  const el = document.getElementById('mou-price');
  if (el) el.value = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(property);
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '/');
  const dateEl = document.getElementById('mou-date');
  if (dateEl && !dateEl.value) dateEl.value = today;
  const overlay = document.getElementById('mou-overlay');
  if (overlay) { overlay.hidden = false; document.body.style.overflow = 'hidden'; }
}

function buildD2MouPdf(data) {
  /* -- D2 calculator values -- */
  const property      = num('d2-property');
  const deps          = num('d2-deps');
  const vat           = CONFIG.shared.vatRate;
  const c             = CONFIG.d2;
  const imtBase       = property * c.imtRate;
  const isBase        = property * c.isRate;
  const notary        = c.notaryBase * (1 + vat);
  const transferTotal = imtBase + isBase + notary;
  const legalAdvisory = c.legalAdvisory * (1 + vat);
  const visaApp       = c.visaFee * Math.max(0, deps) + 1;
  const adminFees     = c.adminFees;
  const insurance     = c.insuranceBase * (1 + vat);
  const legalTotal    = legalAdvisory + visaApp;
  const otherTotal    = adminFees + insurance;
  const totalCosts    = transferTotal + legalTotal + otherTotal;

  /* -- jsPDF -- */
  const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!JsPDF) { console.error('[S&A] jsPDF not available'); return; }

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W   = 210;
  const M   = 18;
  const cW  = W - M * 2;
  const HDR = 38;
  const FTR = 287;
  const BOD = HDR + 7;

  const green  = [61,  79,  69];
  const cream  = [250, 246, 238];
  const sand   = [242, 237, 227];
  const sandL  = [234, 226, 210];
  const linec  = [216, 208, 194];
  const muted  = [138, 133, 120];
  const ink    = [26,  26,  26];
  const accent = [92,  112, 100];

  const fg = (...a) => doc.setTextColor(...a);
  const bg = (...a) => doc.setFillColor(...a);
  const ln = (...a) => doc.setDrawColor(...a);

  const MOU_LOGO_B64 = 'iVBORw0KGgoAAAANSUhEUgAACbEAAAOCCAYAAABDYg3eAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nOzd63kUR9YA4FP7fP+tjWCHCBZH4CGCFRF4iACIABEBOALkCGAjQBsBcgSMI0COoL4fXbKFrEtfqi8z/b7PowcBPTXVc+muPn3qVAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgIPwXDXspNFZf18sAAAAASUVORK5CYII=';

  let pageNum = 1;

  function drawHeader() {
    bg(...green); doc.rect(0, 0, W, HDR, 'F');
    const logoW = 65, logoH = logoW * 898 / 2481;
    const logoX = (W - logoW) / 2;
    const logoY = (HDR - logoH) / 2 - 3;
    doc.addImage('data:image/png;base64,' + MOU_LOGO_B64, 'PNG', logoX, logoY, logoW, logoH);
    fg(...cream);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('D2 VISA PROGRAM - MEMORANDUM OF UNDERSTANDING', W / 2, HDR - 3, { align: 'center' });
  }

  function drawFooter(n) {
    ln(...linec); doc.setLineWidth(0.25);
    doc.line(M, FTR, W - M, FTR);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('Smith & Adams Group - MOU - D2 Visa Program', M, FTR + 4.5);
    doc.text('Page ' + n, W - M, FTR + 4.5, { align: 'right' });
  }

  function drawBand(y, text) {
    bg(...green); doc.rect(M, y, cW, 7.5, 'F');
    fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(text, M + 3, y + 5.5);
    return y + 7.5;
  }

  function drawArticle(y, text) {
    fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(text, M, y);
    return y + 5.5;
  }

  function para(y, text, sz) {
    sz = sz || 8.5;
    fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(sz);
    const lines = doc.splitTextToSize(text, cW);
    doc.text(lines, M, y);
    return y + lines.length * (sz * 0.352778 * 1.42) + 1.5;
  }

  function mutedPara(y, text, sz) {
    sz = sz || 7;
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(sz);
    const lines = doc.splitTextToSize(text, cW);
    doc.text(lines, M, y);
    return y + lines.length * (sz * 0.352778 * 1.42) + 1;
  }

  /* ----------------------------------------
     PAGE 1
  ---------------------------------------- */
  pageNum = 1;
  drawHeader();
  drawFooter(pageNum);

  let y = BOD + 4;

  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('Lisbon, ' + (data.date || ''), M, y);
  y += 8;

  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('BETWEEN', M, y);
  y += 6;

  const half = cW / 2;
  bg(...green); doc.rect(M, y, cW, 7, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('THE SELLER', M + 3,        y + 5);
  doc.text('THE BUYER',  M + half + 3, y + 5);
  ln(...linec); doc.setLineWidth(0.2);
  doc.line(M + half, y, M + half, y + 7);
  y += 7;

  const sellerLines = [
    'MARGEM VIGILANTE INVESTIMENTOS',
    'IMOBILIARIOS LDA',
    'Tax ID: 517878267',
    'Av. da Liberdade 258, 9',
    '1250-149 Lisboa, Portugal',
  ];
  const buyerLines = [
    data.buyerName   || '___________________',
    'Passport: ' + (data.passport     || '___________________'),
    'Nationality: '  + (data.nationality  || '___________________'),
  ];
  const pRowH = Math.max(sellerLines.length, buyerLines.length) * 4.8 + 6;
  bg(...cream); doc.rect(M, y, cW, pRowH, 'F');
  ln(...linec); doc.setLineWidth(0.2);
  doc.rect(M, y, cW, pRowH, 'S');
  doc.line(M + half, y, M + half, y + pRowH);
  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(sellerLines, M + 3,        y + 5);
  doc.text(buyerLines,  M + half + 3, y + 5);
  y += pRowH + 7;

  y = para(y,
    'The parties identified above enter into this Memorandum of Understanding (MOU) regarding ' +
    'the purchase and sale of the property described below, under the terms and conditions ' +
    'set forth in this document.', 8.5);
  y += 3;

  y = drawBand(y, 'PROPERTY DETAILS');
  y += 2;

  const pdLW = cW * 0.38;

  const pdRow = (label, value, alt) => {
    const rH = 8;
    bg(...(alt ? sand : [255, 255, 255]));
    doc.rect(M, y, cW, rH, 'F');
    ln(...linec); doc.setLineWidth(0.2);
    doc.rect(M, y, cW, rH, 'S');
    doc.line(M + pdLW, y, M + pdLW, y + rH);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(label, M + 3, y + 5);
    fg(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    const pdRW = cW - pdLW;
    const vLines = doc.splitTextToSize(value || '___', pdRW - 5);
    doc.text(vLines, M + pdLW + 3, y + 5);
    y += rH;
  };

  pdRow('Unit Number',     data.unitNumber      || '___',                     false);
  pdRow('Purchase Price',  'EUR ' + fmtEUR(property),                         true);
  pdRow('Project Type',    data.projectType     || '___',                     false);
  pdRow('Payment Plan',    'As per schedule - see Payment Plan section',       true);
  pdRow('Purchase Date',   data.purchaseDate    || '___',                     false);
  pdRow('Developer',       data.developerDetails || 'Margem Vigilante Investimentos Imobiliarios LDA', true);

  /* ----------------------------------------
     PAGE 2
  ---------------------------------------- */
  doc.addPage(); pageNum = 2;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = drawBand(y, 'PAYMENT TERMS');
  y += 5;

  y = drawArticle(y, 'Article 1 - Rights and Obligations');
  y = para(y,
    'The Buyer will assume all rights and obligations to purchase the referred Property from ' +
    'the date of signature and transfer of the amount agreed.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 2 - Delivery of Property');
  y = para(y,
    'Should it not be agreed otherwise, the Property will be delivered upon completion, free ' +
    'from charges and encumbrances and tenants.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 3 - Reservation Fee');
  y = para(y,
    'It is understood between Seller and Buyer that for this MOU to be valid and legally ' +
    'binding, the Buyer shall pay to the Seller the amount of EUR 20,000 (twenty thousand ' +
    'euros) as an initial reservation fee on the date of signing.', 8.5);
  y = para(y, 'Payment details are mentioned below:', 8.5);
  y += 1;

  bg(...cream); ln(...linec); doc.setLineWidth(0.3);
  doc.rect(M, y, cW, 24, 'FD');
  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('NOVO BANCO', M + 4, y + 7);
  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('IBAN: PT 50 0007 0000 0069 9454 9732 3', M + 4, y + 13);
  doc.text('SWIFT: BESCPTPL',                        M + 4, y + 19);
  y += 30;

  y = drawArticle(y, 'Article 4 - D2 Visa Conditions and Reimbursement');
  y = para(y,
    'Both parties acknowledge that obtaining Portuguese nationality through the D2 Portuguese ' +
    'Entrepreneur Visa ("D2 Visa") is an essential condition of this agreement. Accordingly, ' +
    'the Seller undertakes to reimburse the Buyer for all amounts paid under this agreement if ' +
    'the D2 Visa is not pre-approved by the Portuguese immigration authorities in relation to ' +
    "the Buyer, provided that such refusal is solely attributable to the Seller or the Seller's product.", 8.5);
  y = para(y,
    'Furthermore, in accordance with Article 85 of the AIMA, which states that "The residence ' +
    'permit of citizens that are absent for longer periods than those established in paragraph 2 ' +
    'will not be cancelled if they prove that during their stay abroad they resided in their ' +
    'country of origin where they carried out a professional or business activity or one of ' +
    'social or cultural nature", the present property package is being offered and sold under ' +
    'this framework that allows for such exemptions.', 8.5);
  y = para(y,
    'Should any issues arise at the stage of D2 Visa renewal or during the process of obtaining ' +
    'Portuguese nationality, the Buyer shall have the right to resell the acquired property back ' +
    'to the Seller and to be reimbursed for the full purchase price paid, including all expenses ' +
    'reasonably incurred in connection with the acquisition.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 5 - Construction Delay, Grace Period, Force Majeure and Buy-Back Right');
  y = para(y,
    'In the event of a construction delay, the Seller shall benefit from a grace period of ' +
    'ninety (90) calendar days after the estimated completion date, during which no penalties, ' +
    'compensation, or liabilities shall apply.', 8.5);
  y = para(y,
    'Should the construction delay exceed the ninety (90) day grace period, the Seller shall ' +
    'pay the Buyer compensation in the amount of EUR 600 (six hundred euros) per month, ' +
    'calculated on a pro-rata daily basis, for a maximum period of seven (7) months.', 8.5);

  /* ----------------------------------------
     PAGE 3
  ---------------------------------------- */
  doc.addPage(); pageNum = 3;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = para(y,
    'If the delay exceeds seven (7) months after the expiration of the grace period, the ' +
    'Buyer shall have the right to resell the Property back to the Seller. In such case, ' +
    'the Seller shall be obligated to repurchase the Property from the Buyer, reimbursing ' +
    'the full purchase price paid by the Buyer together with all documented acquisition-related ' +
    'costs reasonably incurred by the Buyer up to that date, within sixty (60) days from ' +
    "receipt of the Buyer's written notice exercising such right.", 8.5);
  y = para(y,
    "Upon the Buyer's decision to trigger the buy-back mechanism, any compensation payments " +
    'under this clause shall immediately cease to accrue. All yields received by the Buyer, ' +
    'as well as any compensation amounts already paid under this clause, shall remain in the ' +
    'possession of the Buyer, with no obligation of refund to the Seller.', 8.5);
  y = para(y,
    'The Seller shall not be held liable for any construction delays, non-performance, or ' +
    'failure to comply with the estimated completion timeline arising from events of Force ' +
    'Majeure. For the purposes of this Agreement, "Force Majeure" shall include, but not be ' +
    'limited to, acts of God, natural disasters, war, terrorism, civil unrest, governmental ' +
    'actions or restrictions, changes in applicable laws or regulations, labor strikes, ' +
    'shortages of materials, supply chain disruptions, pandemics, banking disruptions, delays ' +
    'caused by public authorities, utility failures, or any other circumstances beyond the ' +
    'reasonable control of the Seller.', 8.5);
  y = para(y,
    'In the event of a Force Majeure occurrence materially affecting the construction ' +
    'timeline, the estimated completion date shall be automatically extended for the duration ' +
    'of such event and its direct consequences.', 8.5);
  y += 4;

  y = drawArticle(y, 'Article 6 - Governing Law and Jurisdiction');
  y = para(y,
    'This Memorandum of Understanding (MOU) and any dispute, controversy, claim, or ' +
    'obligation arising out of or in connection with it, including its validity, ' +
    'interpretation, execution, breach, or termination, shall be governed by and construed ' +
    'in accordance with the laws of the Portuguese Republic.', 8.5);
  y = para(y,
    'The Parties agree that any disputes arising from or related to this Agreement shall be ' +
    'submitted to the exclusive jurisdiction of the courts of Lisbon, Portugal, expressly ' +
    'waiving any other jurisdiction that may otherwise apply.', 8.5);
  y = para(y,
    'Prior to initiating any judicial proceedings, the Parties shall use their best efforts ' +
    'to resolve any dispute amicably and in good faith within a period of thirty (30) days ' +
    'from written notification of such dispute by one Party to the other.', 8.5);

  /* ----------------------------------------
     PAGE 4
  ---------------------------------------- */
  doc.addPage(); pageNum = 4;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = drawBand(y, 'PAYMENT PLAN');
  y += 2;

  const ppLW = cW * 0.55;

  bg(...green); doc.rect(M, y, cW, 7, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('DESCRIPTION / DUE DATE', M + 3,     y + 5);
  doc.text('AMOUNT (EUR)',            W - M - 3, y + 5, { align: 'right' });
  ln(...linec); doc.setLineWidth(0.2);
  doc.line(M + ppLW, y, M + ppLW, y + 7);
  y += 7;

  const ppRow = (desc, date, amount, alt) => {
    const rH = 11;
    bg(...(alt ? sand : [255, 255, 255]));
    doc.rect(M, y, cW, rH, 'F');
    ln(...linec); doc.setLineWidth(0.2);
    doc.rect(M, y, cW, rH, 'S');
    doc.line(M + ppLW, y, M + ppLW, y + rH);
    fg(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(desc, M + 3, y + 5);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    if (date) doc.text('Due: ' + date, M + 3, y + 9.5);
    fg(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(amount || '___', W - M - 3, y + 7, { align: 'right' });
    y += rH;
  };

  ppRow(data.pp1desc, data.pp1date, data.pp1amount, false);
  ppRow(data.pp2desc, data.pp2date, data.pp2amount, true);
  ppRow(data.pp3desc, data.pp3date, data.pp3amount, false);
  if (data.pp4desc || data.pp4date || data.pp4amount)
    ppRow(data.pp4desc, data.pp4date, data.pp4amount, true);
  if (data.pp5desc || data.pp5date || data.pp5amount)
    ppRow(data.pp5desc, data.pp5date, data.pp5amount, false);

  y += 10;

  y = drawBand(y, 'TRANSACTION COSTS (BUYER REFERENCE)');
  y += 2;

  const rH = 7;
  const c1 = M;
  const c2 = M + cW * 0.50;
  const c3 = M + cW * 0.66;
  const c4 = W - M;

  bg(...green); doc.rect(c1, y, cW, rH, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('DESCRIPTION', c1 + 3, y + 5);
  doc.text('BASE',         c2 - 2, y + 5, { align: 'right' });
  doc.text('TAX',          c3 - 2, y + 5, { align: 'right' });
  doc.text('TOTAL',        c4 - 2, y + 5, { align: 'right' });
  y += rH;

  const cSec = (lbl) => {
    bg(...sand); doc.rect(c1, y, cW, 6, 'F');
    fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text(lbl, c1 + 3, y + 4.5);
    y += 6;
  };

  const cRow = (desc, base, tax, total, sub) => {
    bg(...(sub ? sandL : [255, 255, 255]));
    doc.rect(c1, y, cW, rH, 'F');
    fg(...ink); doc.setFont('helvetica', sub ? 'bold' : 'normal'); doc.setFontSize(8.5);
    doc.text(desc, c1 + 3, y + 5);
    if (base) {
      fg(...muted); doc.setFont('helvetica', 'normal');
      doc.text(base,  c2 - 2, y + 5, { align: 'right' });
      doc.text(tax,   c3 - 2, y + 5, { align: 'right' });
    }
    fg(...ink); doc.setFont('helvetica', sub ? 'bold' : 'normal');
    doc.text(total, c4 - 2, y + 5, { align: 'right' });
    ln(...linec); doc.setLineWidth(0.2);
    doc.line(c1, y + rH, c4, y + rH);
    y += rH;
  };

  cSec('PROPERTY TRANSFER COSTS');
  cRow('IMT - Property Transfer Tax',   fmtEUR(imtBase),       '6.5%', fmtEUR(imtBase));
  cRow('Stamp Duty IS',                 fmtEUR(isBase),        '0.8%', fmtEUR(isBase));
  cRow('Notary and Registration Fees',  fmtEUR(c.notaryBase),  '23%',  fmtEUR(notary));
  cRow('Transfer Subtotal',             '',                    '',     fmtEUR(transferTotal), true);

  cSec('LEGAL & IMMIGRATION FEES');
  cRow('Legal advisory',                fmtEUR(c.legalAdvisory), '23%', fmtEUR(legalAdvisory));
  cRow('D2 Visa fees',                  fmtEUR(c.visaFee),       '0%',  fmtEUR(visaApp));
  cRow('Legal Subtotal',                '',                      '',    fmtEUR(legalTotal), true);

  cSec('OTHER FEES');
  cRow('Administrative fees',           fmtEUR(c.adminFees),     '0%',  fmtEUR(adminFees));
  cRow('Insurance',                     fmtEUR(c.insuranceBase), '23%', fmtEUR(insurance));
  cRow('Other Subtotal',                '',                      '',    fmtEUR(otherTotal), true);

  bg(...green); doc.rect(c1, y, cW, rH + 2, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Total Programme Cost',              c1 + 3, y + 6);
  doc.text(fmtEUR(property + totalCosts),       c4 - 2, y + 6, { align: 'right' });

  /* ----------------------------------------
     PAGE 5
  ---------------------------------------- */
  doc.addPage(); pageNum = 5;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = drawBand(y, 'SIGNATURES');
  y += 8;

  const sigLW = cW / 2;
  const sigH  = 46;

  bg(...cream); ln(...linec); doc.setLineWidth(0.3);
  doc.rect(M, y, cW, sigH, 'FD');
  doc.line(M + sigLW, y, M + sigLW, y + sigH);

  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('THE BUYER',  M + 3,          y + 7);
  doc.text('THE SELLER', M + sigLW + 3,  y + 7);

  ln(...ink); doc.setLineWidth(0.4);
  doc.line(M + 3,         y + 30, M + sigLW - 3, y + 30);
  doc.line(M + sigLW + 3, y + 30, W - M - 3,     y + 30);

  fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Signature',   M + 3,         y + 35);
  doc.text('Signature',   M + sigLW + 3, y + 35);

  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(data.buyerName || '___________________', M + 3, y + 40);
  fg(...muted); doc.setFontSize(7.5);
  doc.text('MARGEM VIGILANTE INVESTIMENTOS', M + sigLW + 3, y + 40);
  doc.text('IMOBILIARIOS LDA',               M + sigLW + 3, y + 44);

  y += sigH + 8;

  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Date: _____ / _____ / _______', M,           y);
  doc.text('Date: _____ / _____ / _______', M + sigLW,   y);
  y += 14;

  ln(...linec); doc.setLineWidth(0.25);
  doc.line(M, y, W - M, y);
  y += 5;
  mutedPara(y,
    'This Memorandum of Understanding is indicative and does not constitute a legally ' +
    'binding contract. All values are subject to confirmation upon formal agreement. ' +
    'Smith & Adams Group - geral@smithandadams.com', 7);

  doc.save('Smith-Adams-D2-MOU.pdf');
}

/* ============================================================
   GOLDEN VISA MOU GENERATOR
   ============================================================ */

function generateGVMOU() {
  const totalEl = document.getElementById('gv-mou-total');
  if (totalEl) {
    const units = Math.max(1, num('gv-units'));
    totalEl.value = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(units * 250000);
  }
  const unitsEl = document.getElementById('gv-mou-units');
  if (unitsEl) unitsEl.value = Math.max(1, num('gv-units'));
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '/');
  const dateEl = document.getElementById('gv-mou-date');
  if (dateEl && !dateEl.value) dateEl.value = today;
  const overlay = document.getElementById('gv-mou-overlay');
  if (overlay) { overlay.hidden = false; document.body.style.overflow = 'hidden'; }
}

function closeGVMOUModal() {
  const overlay = document.getElementById('gv-mou-overlay');
  if (overlay) { overlay.hidden = true; document.body.style.overflow = ''; }
}

function initGVMOUModal() {
  const closeBtn = document.getElementById('btn-close-gv-mou');
  if (closeBtn) closeBtn.addEventListener('click', closeGVMOUModal);
  const overlay = document.getElementById('gv-mou-overlay');
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGVMOUModal(); });
  document.addEventListener('keydown', (e) => {
    const ov = document.getElementById('gv-mou-overlay');
    if (e.key === 'Escape' && ov && !ov.hidden) closeGVMOUModal();
  });
  applyDateMask(document.getElementById('gv-mou-date'));
  const genBtn = document.getElementById('btn-generate-gv-mou');
  if (genBtn) genBtn.addEventListener('click', () => {
    const data = {
      date:         document.getElementById('gv-mou-date')?.value || '',
      investorName: document.getElementById('gv-mou-investor-name')?.value || '',
      passport:     document.getElementById('gv-mou-passport')?.value || '',
      nationality:  document.getElementById('gv-mou-nationality')?.value || '',
      applicants:   document.getElementById('gv-mou-applicants')?.value || '1',
      totalAmount:  document.getElementById('gv-mou-total')?.value || '',
      units:        document.getElementById('gv-mou-units')?.value || '2',
      pp1desc: document.getElementById('gv-pp1-desc')?.value || '',
      pp1amount: document.getElementById('gv-pp1-amount')?.value || '',
      pp1deadline: document.getElementById('gv-pp1-deadline')?.value || '',
      pp1notes: document.getElementById('gv-pp1-notes')?.value || '',
      pp2desc: document.getElementById('gv-pp2-desc')?.value || '',
      pp2amount: document.getElementById('gv-pp2-amount')?.value || '',
      pp2deadline: document.getElementById('gv-pp2-deadline')?.value || '',
      pp2notes: document.getElementById('gv-pp2-notes')?.value || '',
      pp3desc: document.getElementById('gv-pp3-desc')?.value || '',
      pp3amount: document.getElementById('gv-pp3-amount')?.value || '',
      pp3deadline: document.getElementById('gv-pp3-deadline')?.value || '',
      pp3notes: document.getElementById('gv-pp3-notes')?.value || '',
      pp4desc: document.getElementById('gv-pp4-desc')?.value || '',
      pp4amount: document.getElementById('gv-pp4-amount')?.value || '',
      pp4deadline: document.getElementById('gv-pp4-deadline')?.value || '',
      pp4notes: document.getElementById('gv-pp4-notes')?.value || '',
      pp5desc: document.getElementById('gv-pp5-desc')?.value || '',
      pp5amount: document.getElementById('gv-pp5-amount')?.value || '',
      pp5deadline: document.getElementById('gv-pp5-deadline')?.value || '',
      pp5notes: document.getElementById('gv-pp5-notes')?.value || '',
    };
    buildGVMouPdf(data);
    closeGVMOUModal();
  });
}

function buildGVMouPdf(data) {
  /* -- GV calculator values -- */
  const units              = Math.max(1, num('gv-units'));
  const underlyingProperty = num('gv-property');
  const deps               = num('gv-deps');
  const vat                = CONFIG.shared.vatRate;
  const c                  = CONFIG.gv;

  const participationUnit = units * 250000;
  const transferBase      = underlyingProperty * c.imtRate;
  const stampDutyBase     = underlyingProperty * c.isRate;
  const notary            = c.notaryBase + c.notaryBase * vat;
  const acqTotal          = transferBase + stampDutyBase + notary;
  const legalAdvisory     = c.legalAdvisory * (1 + vat);
  const govMain           = c.govFeesPerPerson;
  const govDeps           = c.govFeesPerPerson * Math.max(0, deps);
  const legalTotal        = legalAdvisory + govMain + govDeps;
  const mgmtBase          = participationUnit * c.fundMgmtRate;
  const mgmt              = mgmtBase * c.fundMgmtYears;
  const depository        = c.depositoryPerYear * c.depositoryYears;
  const cmvm              = c.cmvmPerYear * c.cmvmYears;
  const audit             = c.auditPerYear * c.auditYears;
  const subscription      = c.subscriptionFee;
  const snaAdmin          = c.snaAdminPerYear * units * c.snaAdminYears;
  const fundTotal         = mgmt + depository + cmvm + audit + subscription + snaAdmin;
  // Fund & administrative costs are already covered within the participation unit value.
  const grandTotal        = participationUnit + acqTotal + legalTotal;

  /* -- jsPDF -- */
  const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!JsPDF) { console.error('[S&A] jsPDF not available'); return; }

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W   = 210;
  const M   = 18;
  const cW  = W - M * 2;
  const HDR = 38;
  const FTR = 287;
  const BOD = HDR + 7;

  const green  = [61,  79,  69];
  const cream  = [250, 246, 238];
  const sand   = [242, 237, 227];
  const sandL  = [234, 226, 210];
  const linec  = [216, 208, 194];
  const muted  = [138, 133, 120];
  const ink    = [26,  26,  26];
  const accent = [92,  112, 100];

  const fg = (...a) => doc.setTextColor(...a);
  const bg = (...a) => doc.setFillColor(...a);
  const ln = (...a) => doc.setDrawColor(...a);

  const MOU_LOGO_B64 = 'iVBORw0KGgoAAAANSUhEUgAACbEAAAOCCAYAAABDYg3eAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nOzd63kUR9YA4FP7fP+tjWCHCBZH4CGCFRF4iACIABEBOALkCGAjQBsBcgSMI0COoL4fXbKFrEtfqi8z/b7PowcBPTXVc+muPn3qVAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAj0tzdwAAuFvOeRMRT8vPvyJi88hDriLit4jYR8Q+pXQxXu8AAGB8OeeT+H5M/LT81/aRh15GMz7eR8TvEXERzRh5P0I34SjknHcR8eGBTZ65zgRuyjl/jIjTe/77KiKepJSuJuwSwCA556fRxOGvrzv+HREntzbbR3ONEVGuO4yRAKAOSWwAsCA559OI+E80N+U2FZq8jOaG3f8i4kLgEDgmJbD4ZyBRwHB6N5JLrl2llC7n6g9wHMqY+KdoxsRPH966s318Pz7eV24fDlbO+Ws8fB16kVJ6NlF3qOiOMdttj/3/Xa6ThSPCWHyNyuTLr49s9jaldDZ+bwD6Kcey65j8d3GmHi7Lz2/RjJvERwCgI0lsADCzkoTxMpqL5SEXyW1cRsSvEfHJDbtGznkbj1fyuOm9ZMDDkXN+FY98r9YQUM85n9VucwmvW4sbrTfty09X11Uuj8Fds4fb6BLEnf3m9rF+3ufQ4xzZxj6ldF65TY7Ajckcu4mf2vgYolUVtmtPfFeGyzm/i++Txv7X4eH3VWrf3PPvU9vf+Pk9muPs3o3845Nz/hCPn7f3KaUnE3SHe3S8Pvrku3pYWsS9XH/doSR37yLi56g/aeamfTQTaP6bUvo04vMAAADAMDnnbc75c57P59zcqFi1nPNZx9ftbO4+005uvmOPmrufU8j1jzXf5t6niIjK+0QlC/hcfK28S4v4vM8htzyOdvRu7v1iOXLOJ7kZi30d4bPWx8fcJG/C6uT248U2iW48Iuf8brQj2bJ9zjl/yDnvcjOhjwOVm3N4W7u5+7tWOeenXb+jc/eZ9nK767XHqiWuSs55U85Dc/hWntv5DwAe8I+5OwAAa1Mulj9HxOeoX92ki21EfCgX0Ge5KZ2+Rv/uuP3L3MzWY/netNloJcGjLpUd2rio3F5nWZLBYi3gfHKx8PYOxkjLgv13hDY5MLkkr0WzBNmbWEbloIimMvLn3CTV7ebuDEwld6u8uXM9VEXt8fmh2EZT+eZDRHwp8YiPuUlq28zZMTp71WHbl6P1gsd0PV5vc1Mdl8PQJu61GbsTh6Bcf7yL5vpjN1M3rqu/fck5f3G9AQB3k8QGABO6cbNuO29PvnMSTdDja5kNtp25P1PrGtA7iW7BWmbQ8UbcGm7C1V4OZAnLa64h+fBQzf3e1L4pvITP+5xqHz8sT7Ry5cbol2jGn0POwftokkzPI+LtrZ9P5f/6LgG/iWayx9cVjo1Zp64JJq6HhruYuwMLcRJNAvGHaGISX3JTpW7u8SQPKImsXY4bT51PZ7Pp8RiVkw9ASYDattx21cfUcv3xNZY1fnkaJpcDAAAwlzLb63O14uPjWtXSAbnf8lXfsuDCouXm5kdbZ3P3d2y5qQBZ03YB+7TWJZgOwdnMn42uS+Y8Zjvn/swt1/2uWcpmxXIzHv444PNzvfzOae5QBSo358DT8thvPZ/7Yzb240jlfuPEb12+h9wtL2cp5aX6knN+lX3WFic3lfO6+jh3v9coN8kxfezm7jsPy93OIdu5+zuHPPz6Y1Jzv14AsBQqsQHAyHIz221p1df4y6bHY66r17FAuQm2rnqW6W0ppX3lJpdQScl7vFxdl2muKqWkclhdv1dsa+2v5WrdGA/3WZ7qMiJepJT+mVJ6kVL6lFJqXWEtpbQvj3mRUvpnRDyPplJbF6fRLPtjeS2OUZ/rmuvqWQyzn7sDC/c0mopQ10nMm5n7w1/6HDdOvYez+KHn495kCaSLVeJemw4P2Y7SkQUr1x+fw3gFAA6OJDYAGFEJKnyO/ksl7aNZIul1RDyLiCfploj4sfzf9dJJfZdNWp2BAbmdAOxidQ2o/zRKL5bnolI7V12SB0a0nbsD3GsJCYa1kqWW8nmfU83Es7UvzbpKZTz8JbqPh/cR8Tyl9GNK6bxWf0pC2/OIeBLdktlOIuJjzvlDrb7A3Mr10K7nw03qGa72EujHbBfNcqOS2WbWI3nmJseN6fW9NtvEspZepCjn7q7fpb7JjAfpRgLbkNjEZUS8j79i8rd/nkcTiz+POknpNdoAgKPwf3N3AACOVQns9b3JdR4Rv6aULh7b8EbFmT+3LVUiXoYkj8cMTbR4F03QgoXoGVBfy+ziWok4s1dScuNq8TZzdyCO6PO+ADVfg33FtjgAA8bD7yPi7ZhJpKVK6fPcLK/0MdqPB3blxtgzSa4cgSEJCpuc82lKqWtlQ/4y9jHk4tbfLyPijxbb3Wdb/vwhmmvpk5h+8sIumuPweTTnif3Ez0/EzwMee5pzfu38Oakh8Y6XOef33q/FeRXdr7mXMNFsEiUm/iH6ffYvI+KXiGhb+fnPMVCJU+2iOUZuejz3vsdjAOAopbk7AADHqNwM+9zjoRfRLJe0r9iPN9Etme0ipfSsxvMvXQlsfBzYzLM2yYaMr8xG/Ro9AlWlquFRyzmfRZ2Z79cVbGYz4Bg7xFV8n8xz103AfdwfeBza3/uOy5v4e4D0+sbite3A5+5j1mPjMX3elyDnnCs15Zy5Ij0T2K6iGQtPmhRTxhAfottyQ5chkY0DNmTsfMNqrh3HUHFMex4Rv0ZEzHGeLYm9m2jGnz/FtGPPtxEhyWYilT6zb1NKZ8N7QxsVxvHerwUZcO7ep5SejNClRblRga1PBegXtc6h5TroTXRLZjOmAoBCJTYAqKxcMPdJjHqdUnpfsy/l4vuiXDy/i/VUnGqrxkzEN1FvmUaGeRU9P+M5541Z/K0tYTnAbeX2rhPUruKv/bsof17WuCk29N5BjWBqCXhfH/e25c+fbv29lk3l9uayhM/7Euyjznu6r9AGB2BAAtuzG1WGJ1OO88/LUqG7lg97GhGfc84S2ThUpzH8+nCbc346x/f2SNQ6dvw+Z5J4ef8v4/uKNNuI+E80n7PNiE//JiJ+zjlXSz7gQUOqsN1s46xCO0zjZc75XLxkMfrGvTaV+7E4AxLYqleATimd55w/RfN+WUYZAACA+eScT3LOX3J3uwn6tmnZt6GVyQ5Gzvmsx3t1l+3c+7J2ufnuffMe3i/nvK3zcc9nC9iXjz37/jnn/CE33/3TPOH7PvRFn6iPJ7n5nJyW1+hjec36eDdFnx/Yl6P5vC/BgM/Bd+beD6aRc37a4+PxLTc3nmaXm/NEF6sZO3Nccs5fe3xX79JnyWCKSu/B2dz78ZDcnBfe5WHXa228y82kDUaQm5hSLbu592cNcr1rIsf5BcjNd3DIcXQz9z6MJS87Hv80txtzTb3aAAAAAGuQm6Dp4i6Yb/TvJD+e/HE2VX/mlivdlM85f5l7X9YuD09IfDX3Powt1wtgd1lqbax9eSw4+S033+/rZLXNAvo8yAL6/zT/ldz2OT8ePJ81AJvrfd53c+7HUmRJbLSUm7Hm1x4fj0UksF3L3RLZ3HDi4OTmnF7TZu59OlSVXv+zufejrZzzLtdLoLzLl7ywc8qxyN2TvB98n+benzXI9a6Jcnacn10e/h3czr0PY8mHEY9/LI7lmgIAAIC6cr/g0NlMfX0okW2WPs0h10tiy1miw2zy8NmoOa/gc5/7Vca5y3YB+3Lbl9wELXd5ocH1oS/63P2/S24+U7vcBNO/3urytwX0rYbtnPuxFLnfTYHbBOVXoOdnZTd3v++S21dzUJ2Eg5PrXgflvIKx9FhynYSus7n3o6vcxE8+V9j3u3zLC5h4c0zy8Mrnd9nOvV/HLtdbfSBnlWdnletUQjzKyZu5Xzx+8vF7fjyRzfUyABT/mLsDAHBEul4A71NKZ2N0pIUXEXE503MvybZiW28qtkU3byJi6LIx/67RkSVLKR3Fdz43Nzv2EfE+Ip5HxD9TSj+mlF6nlM5TSvsZu7cqKaXL8pq/SCk9iYgn0ZxfziPiKs+YUHgsn/cF+WPuDrB85fjc9ebYp5TSef3eVPE8Iq5abPf72B2Bmsp3dVu52ZfZMo597efuwBxSShcppWfRjB33lZs/iYiPx5qwMZNXMfya+7aXldvj736o2NZplng4pxoxx2M9T3eOx0fE6xH68aCU0lVEPIv74/H/m7A7ALBoktgAoILcVJDYdHzY2/o9aadcOLe9MXeURrjJsskLrSRyzEqSzK5CU8cazBvDrMeNcsPrSUla+1SOZyxASml/M6lNQiGsTteba1fRJC8sUjmGtRmvX4zbE6ju5xHaPIkIla/orCQy/xjNBJXa3s1RbedIjZFwdjrnpJeVqL20rsmbMyjJg7sKTf1UoY1FyU0l0k3Hh72dK45UnvdFrDgeDwBtSGIDgDq6BnL2c1edKDfmJp95tiC1g3kRTZBcMtS0agVRt5XaOXoqXLEmKaWLuftwRBw7jlhJ5N92fNgvS09ETim9j8crBC16H+CmihNA7iK5gV5SSlcppdfRVKjZV25+J5FtmHKOHyvO4bgxrtrv21Y1tlnU+p4cVbyyxF+7JtguIR5/GTNObAeAQyCJDQAG6lmF7Zf6PemuXLhfzNyNuYwRvDmJ7sto0VPO+WlUvAm3kgTE/dwdgAnt5+7AEamRgGZJ0uPWtbLTVYxTdWcMD95kktzNgRkzYWSTc1aNrTvLhxVl8sCPEfGpctMS2YYZ87ixW8l1+FzGmLzpuzShykuAj/F5mNMuusd2lxKPfx8meQHAvSSxAcBwfZZVqB2UHeL2jbm1XESPFbx5KQg7mXeV2zu2gN5d9nN3ACa0n7sDR0SlKe5Vksq3HR+2+Cps18qkj/09/72WcTNHoFyjjJ1kNsaSg6xIqcr2POpXqdnlnGtfPx69kpi6GflpTAQcwYhxqU2ZzMs0qiaRHtkSvocej1/z6igA8CBJbAAwQLn475r4si9LeS5Cme18ceOfDuKGYgU/jNTuSVgSY3SVZ6Ne21RuDwDWoGsVtoiI89qdGNl9VRvWMm7mOLyK8ZcS25bEVhgkpXQWES8qN/tK8k1nUySmSn4dx5jHYjGvCZTj1bZys5vK7c2ijDU2HR+29Hg8AFBIYgOAYfrMZF9ixYbas5wPwZgBvVdHNrtxicYImm5GaPPY7OfuAExIcgq003U8/GlJN5BaOr/n3y0DyCGZKlFEQgpVlEqYtRPZPpQJUTxipIljdzmRXDiKzZht55zPRmyfhrjX/fpMormo3YkKbsbjxR8AoJDEBgDD/KfHY36r3ouByuyvt+VnP2tnprMZuX0zU0cyYjD9XyO0eWz2c3cAJrTEpPND5vU8Qj2rIBxc4ldZ+vSu5Yf2E3cFeikJImNXYbu2M6GHWkoiW+0l1z6OuNTiMemTJNKX+El9m5Hbf+l7NJ5y3t6M0PQYbc5h2+Mxv9fuxFC34vFLWuoUAGYliQ0AhtnO3YFaUkpn5Wc/d18mshm5fTdvxvNhpHY3I7ULcOj2Fdows/w4bXs85qJyH6ZyV/LdfupOQE9tE0RqHatVY2uvxmt+1IniKaX3Ubci20lEfKzY3tEpsYxdy833FZ5yo0JedWNP0juJZplqKivJgWMldv57pHYnU16fPqtrLPJcucJ4PAA8ShIbAPRUKk/0sciL5jWZMLlsrGSr1RpxNmrEuEvMLoUkEtZkP3cHjoWAOg/4qeP2VymlQx0LX9zxb4e6L6xIzvk02o+fX0edz/VOhZ7WarzeRz/GLxXZ3j62XQfbnLMEnPt1SUStlWCoGltdmwmeQzW2cbyK8d6/Y3i/+sbujv5cCQDHQhIbAPS36fk4F83z20z0PFuziasbM7B9DMG8xyxuOWMY0eKWC4EjtOm4/cEmfd2RfHdVlhmFpWubjHJVEoV+qfCcJ9G+ihO0klI6i7rLrb1RPf3vSlLSruXm52U5vPMKT731flQ1xSS9k4h4N8HzrEb5/o1ZzXQ7YttT2c7dAQBgXJLYAKC/vgGhNSTKLN2UFbfMJq6kzJTfjPwc2zHbB4Aj03VMdbBJbMXFjd8PfV9YgVI9fNty818i/qx4ta/w9JYUZQwvol613ZNQPf0ur6J93OrX8meN5NcI8ZOapoo97iQfVtXl+9eL6nkAwNJJYgOA6a1hycKlmzJgoxpbBSXINkVAWzAPAMbzx9wdGGh/z++wVF0Syd7f+P3Xe7dqb5Nz3lVoB/5UKmDWWr4yorleP63Y3jH4ueV2l6UK23W10osKz20p4gpmiEFJPqygJANOkQB+6HHpn+buAAAwLklsAMAaTR3wMLt7uNFnoxaHHswDgEn0vEG6r9yNqf1+z++wOOVm+K7l5ue3lsd9HxE1lsttmwwDrZXEqfePbdeB5RCLkni6abn57eprtaqxvarUDtPZmbxZxZuYJu61meA5lmg7dwcAgHYksQFAf//q+TgzxtZHFYIBykzsqZYj+mGi5zlU+7k7ABOqcfMe+N5+7g4MdPO4cDFXJ6ClLuPn75JPSkLbpwp9UJWasbyNeueUTc75rFJbh65tRa2rsvTwn1JKn8JSxEuxneE5VWMboGPi+VCbiZ5nafrG8QGAiUliA4D++s6OU+lpftuW251XfE4Bvf66VGEbmnTi+/kwVWdYk9/m7gCwOJc3fpfoymKVSSC7lptflKUAb3tbqTuqsVFdSbR8XbHJl2tfxrIknG5abn5f1bUax40TkwAHazs5bx/1kkElLQ8zZcxwrclc4n0AcCAksQFAf31vbp/knF04z6RjYPq/US+RzezuHsps1LbBvIv4/uZyH5uBjwcAVuCepB9Yii6TQH696x9TSvuoU41tV8b0UFWp/HVRqbmTsIxllySa+5Zz/RR1krxNAhymbcxxHxEvKj6vpQ+c3lwAACAASURBVHl7KDHiXcvNL2L4d2wz8PGH6unak5UB4FBIYgOAeZiNPp8uCYT7aGZ316q0sfrZ3T10CV7XWFJmM/DxAMD9jmUcJIGNpWt7vbm/vSTgLfdVW+rK8oCMpVbFwIgVf05LEs225ebnpRLe35R/r3Hc2KjqNcim5XaXKaWLqJcM+lQVvV66JP+9juHj0DVPrD6duwMAwOMksQHAPFw0z2fTdsOU0mXFIGyE2d2dlIoNu5abX5Tg6+DlLlVKBIBW+iT5H/Q5NqV0kRo/zt0XuE9JINi03PzOKmzXyvh6P6hDjZ3JPIyhcgLOmpex7JLA91h85HxAP25Sja2/Tcvt/ih/1kwG9b51UJI1ty03Py+VgIdOtD308/GQ/TepHAAOgCQ2AOhvyEXzZsXB0bltWm63v/H7+1CNbQ5dgp+vy581KqN4fwDgEZbThMVqO4a+ivuXBLypRnLDSbSfnAJdqcY2QI/JYw+e/8tSxOeDOtXYmmDWXcflmy8i/kwGrbF8dEQT7zR5s72uqw9ERPw29EkPvNLhkP3fWuIcAJZPEhsA9Df0xp3ZifP4V8vt9te/jFCNrctSAatUAmq7lpuf3wik10g23FZoAwD4u5/m7gAcszKG3rTc/NN9SwLeVJYbrTHGXl1yENMoCTi1EqufrjBxatdh2werN95gKeL5bDpse/PY/vrerbp7Y/Lm43LOp9GtCtu+/L5/YLu21vz+iMcDwMJJYgOA/vYDH68a2zw2Lbf7LgieUjqLOoGiiGY5nbb9WKs+s1Ej6ty8+KFCGwCwBvuO229G6APwl75j6MfUSEhx/cuYaiVNRawocaokGrXd331Jan1UmWR20bNbN4mddNc6CfNmVb2KFfQimgQp1dge13aC61V8n2S4r/Dch5ysezHw8bsVJisDwEGRxAYAPZUAz9AZ6e/MTpxc20DFH3f8W81lSsz8u0epILFtufnN2ajRpppEC4JZANDOvuP2G2NfGEdJ9Ni23Pzi5hi6hTbLjraxmuSgidW4Bjp0n6Le63BaqZ1DsIv2FZm6JgrWSizcVWpnLdq+n3dNAHwb9b5HL4357leSujctN//lVqxrX6ELhzx5c1+hDStkAPw/e/d6HcdxPA675n/83Xgj8P4iMB2BlhEYikDLCERGQCgCUhEAjoB0BFxFQCoCrSMgHEG/H7YhQxABzKXmtvs85+hIImd7emfnWlNdDQsmiQ0Ahhla9ekiJDNNrW0Qbf/wD+qo40NSP4z8e1zbY+I2vp1YuB+4foFWAGinz73wNrsTQER0e67slFxSX57fdOrNt72oA1ZIdL+a0rmq++jHpOYu6jR/56BtYmnnc0DTNB8jJ34iGaqbtlO3/ylZrSY3ZyUfinc+rUvc6w+J5B2T0B+z2nhk0qDybSlFtUAAWChJbAAwzL8T2ngtkD+Njtv5sYDIm0f+vA8j/x6oo1G3LRf/OSl499Bqg3kAMLH/9PjMP9N7AWeuVmHbtVz8UJNLusqqSq0aG2PJiM/caZsItFodK0F97Fn1POO8cRHnVR1vqLYJf7888ufvI68a22vTwf5ZKeUq+ldhuzM0ebnt+pdqn9DGW/snACyTJDYAGGaf1M61kaWTaL2NHxvNXl/47JP6s5XA+Ce9R6Pe81gwtjWBLABopc8LNC+iId+uw7K9quzUwSP7Pp994NK9NmOoz+qmFG2vS0Jp32S0rN9ERa/22g7K++bvUhOmsqqxRfjt/qDGftsee4emaa4e+buhx9Vm4OfnlpG0fBER1wntAADJJLEBwAA10emQ0NQmPDhPoW0w7/DM32dVIYgQ0Ptdx5Hgj41GjcgJkrftBwCcraZp9j0+dk7TtMHoOr4QHzotaNZzkGcgxpI1pejmlJMt62C6tvGRfd8K6IkJURv3Ds/ruM8+NRDhfeTEOiMidqUU1e7/53W0H2D71DV38DTSK/9dss7121oZDwBYEElsADDcv5LauSylvE5qi2/7W8vlDk/9ZX1hux/YlzvbmrxF+5dZh3i8CltEQjAvTCkKAG3te3zGlKKQZxftX4jf9JwSMCJ+fw469P38PZcqkTOSzClFt4ltLU2XRNKhSWg3Az9/x1TEz9t0WPbw2F/U60Tm4M13iW2tVo8qbDdP/P1/h/eo/WwVS1P30axEtrdmyQCAZZHEBgDD3SS29c6D86g2LZdrkwT1ZkA/Hjr7SgR15OOm5eI/PfPyLaMS22qDeQAwsT4JA7tTrnADE+uS2JFRESkjseEijtVoINs+sa3vEttajHr93bZc/FCnae2tVnG7GdJGtV155agpbNou+Fx1vZpA9eQyHWzFOiPimMzXNtb0XMxxP6wrEbH+RN2sQeURER88mwDAckhiA4CBauAna/RXhAfnMW1aLvfsiMY6lezNkM7csznnamzJo1HvfpuhTvKFBQCMoO99sIoqMFB9hti0XPxj3ykB76v34hmDRn5IaAP+oA522ic1d6oJU10G0WVV48pIoI1w7/CcTcvl2sZMDN5MUuO8u5aL74cmj7b01wnWMZq6jQ5JzV3EMR5vQCsALIAkNgDIkRWQi/DgPKZNy+X2LZfLnF7h7Rn/5q+j/WjUttv80K8rAEAXNSmmTwL57ozvfSDL1FXYMts664E8jOqXpHZOLomtYyJN2nR9daDZPqEplVyf9veWy7VKRK5JQvvevfmj7Zmf81OTR+v03kOdwjkusxrbizD1LQAsgiQ2AEhQgwf7xCZfRMSHxPbOXsdpJ9oG9A4R8b5Xh/5sE2c4pU7HKmz756qw3XPo1aH/2Q78PACckz4vkC7CiyLorU7N1vYZ55D0wvtO1jOQqkqMIaMyd0T8fpydkl2HZW9qZbssWYm0u6R2TlHbwQFdEj1TB28mtrUaNR65a7n4vsP1eujxeQqDSd5HTnXYO7tSynViewBAD5LYACBPZmAn4jhK0YNzntbBmY7TUf4UeQGTH8+wIsnbyK/CFpFQie0MfwsA6Oum5+dUVIH+5pgSMCJ+n7LxJqGpFyeYJMT89oltbRLbmlXHAWQRudUbM6f+O8e4SVvblsu1jmElD9o91wqcXQZtdJnCdWjC7uorsdX7kdRzVRyfT3bJbQIAHUhiA4AkI1RjizACLNO25XKHLo0mB0wu4oyqsdWX1m2/b5fRqBER/+ncoT9bfUAPAKYwMKHFvS50VO+jty0Xv+1QzbiLrMQ41dhIVa9JWQPNNkntLMFltB9A9rFWns+Wcd64CNXY/qRjYl/X5KdXHZd/yrtzSkKsidrblovfdBxUO/g8dyKDSbKrsUVEXEtkA4D5SGIDgFxdRsy1JZEtx19bLnfo0XZmwOTHEwkitTFm9YiMKWQ2CW0AwLno+2J6W0o5myR+SNLlPjq7QklERNQEl31CU5dn9PzDdLKmFP0uqZ0lmP28EREfIyd2Ivn1z7oMwuv0G9Tz/U2XzzzhrAZvxrhxr187Lv8tm4Q2ZlUTl8eIx0tkA4CZSGIDgER1xNz7EZqWyDZc24DeoWvDNWCSVYngIroFuVapvqjatVz8Y8cqbBE5gfFNQhsAcBYGvuB8K4kF2qkVbHYdPnIzTk8iIu8Z6OSff5jcL3N3YElqIsam5eKHHs/frSRWsj/XaSmfsmm7YMdqX3cyp6U+iylhSymX0a0K26HjKrou/y0nMQNBrTiblbx8n0Q2AJiBJDYAyPdT5AQSHpLINkzbAFmvaSibpnkfeb/77gxe5HbZl/uMqMwIXv09oQ0AOCd9X3BehGlFoa0uFWz6vBRvrSa6ZLR/eQ4JDUwqq1L6Nqmduf3QYdnMZKVvuUlqp8t3Ogeblssd+jReryVZg3bPpRrbu5bL9a0kdujxmYdO6dqbOe3tfRLZAGBiktgAIFkdWTrWg7NEtv7aji4ckvyUGextG+xanVLKNsYdjXp3HA51SsE8ABjdwGps21LKVVpn4ATVRK8u0+j9a6y+3JPxDHQuCQ1MZ4yKPKvU8fn7tlY0Gk3i1JTb+t04+lvL5Q4D1vFT5CWInnQV3o7VD3/uGcM69PjMQyczZXKtMDhWEq5ENgCYkCQ2ABhBHZE+xrSiERLZOusYGOsdkKvB3kPfzz9wecIB2S7TBQ0JQO0HfDbiRKZVAICJvYn+91NvT/j+BzJcRvuBFl/GmhLwvvoMlJHU0CU5D55zyGroBBJtuhxbGVN9Trke1dj+Z9Nyud4JnonTwd455amk23632+gZP06qtHpSgzebprmK8ZKYJbIBwEQksQHASJqmeRPjPThLZOtm03bBhBc9mVX4Ti6g13EU+E9jTn/UwkkF8wBgIkOTwD+cQMIAjKXL88FUyShZ67rwcpgsyc+Rm8S2JlWvp5cdPnIzTk/+qFZM2ic0tXPP8Lu291//Hbie95FXje0kf79aWXjTcvG+VdjuDI07n+Lgze8jbx99SCIbAExAEhsAjGvMB2eJbO21DcoM/q1qEtx+aDvVKU6P0Xaa1N6jUe/5ZeDn4wS3PwCMopTyopTyKSI+xbBE8Is4JrJJJod7Ok5Ndhh7SsAHsqqQn9wgHmY1VixmTbocUzcTDyLLSrRVxfGo7X3TfshKasLVmyFtPHBScc2O034fauWwIQaf507tnruexzIHGD8kkQ0ARiaJDQBGVB+cvx9xFRLZ2mk95U7S+oZMgflQ26SvxatBnrYJhUNHo2Y5qWAeAGQrpVyUUt5FxOdoX231OS/ixF5qQoIu0+b9a7RefEO9b79JaGpjEAmJxqqMvwo1MWXX4SNTnzc+Rs60r7tTS8LpaurzZk2SPiQ1d2qDN19H+zhSRuww4zx3ctXY6vklMzb70HUp5fWI7QPAWZPEBgAjq5W5xhwBtiulqFbxtO9aLpeSNJVcje3FCY3wazsKPKMKW0TOb3BywTyArkopzoV8U33p+DmOL+yyXRqsAUf1WNt2+EhWZbQusl4Wq8bG0mzm7kBPXa7N+xrHmFrGeaNrst4pah0PTPydMxOETuK836MK203CaodODxux3nPck2qVu5sRV/HOswoAjOMvc3cAAM5B0zQ3pZTvYrzA2mUcR62/XEj1qqVpG9D7NXGdryLit6S23sa4gZfRdZz+6Kek/Tijjb8ltAGs098XXhXgIrol2v61xfLb3r3h7NTqa2NXINiVUn5tmmaOhJzfdbyPGV3C1FOsT5fp8m7meCZsmuZQStnH8GvJtpSymXhaQ3jKZu4OdNUxmSZi4ips93yMY/X5oYMyf4x5kneXou0zQdq1ocY5f+yw7qdsSymXtXrWmnXZl7OmZN3H8CTAzfBuLNabOO6jYw3K2pVSommaMQevAwAAwHhKKddlXJ9VZPuzDttvl7ze68TfNrVvUyrHacZ+a/k9sxL/7tY91KfM/sytlHI1cHtczf0d1mrojjh3/9coYX8n13bufYIc5Xhd/9zyd/9cStmUUr4O3H92M3/nTwP7n2rObcH0yvEY6mK26pmllG3Sbn42lU0yttnc32GpSinvhu+KpZQVPgOVUnYdvl/qM3iPvmbds+/m/B5zKu1jT6nxjZJ3zi9l5v1wqNLtWp32OyT9Bh+y+rNEpduzS+9tWMTjASCN6UQBYEJ1ZNbNiKt4ERGfi2m/fldK2XRY/JC8+szpFd6tOCDyOjpUYUte99CRxpuMTgDAKaj3mJ+jXTWDLxHxslZTejlw1ddl3pfT/4rjPcrdPzeRN3X8U27ret4/WD/npUuFlX3TNF9G68kz6jR1h4Smdit+9mE5MqbZW6su5425qrDduUlq54ekdtZo03K5Q+ZK6zl/n9TcZuZ7vaG6HHNp93JJ08Oe9PW2Vqd9Gcdnk7FcRsQn9y4AAACsVhm/IttXiWxHpduoxM0I688a/V3KOkeAX5T21VfSR96WhMop2X2aU1GJbTb2w+kl7O/k2s69TzBMKeVF6XBNLw9e4pRuVWEes5vp639TOd7n7Er7irNtfV3ad2UedR/r4nIBfc441ks5k/vOohLbaEreveDV3N+li1LKZcfvN3vSRcmLkW3n/i5zKO3vz65GWHdqNbaygP2xq3K8R24rvdp/GV7x+CyuI2WaimxmSAGABCqxAcAMJqjIdhHHEWAS2dpVComIiFopJNtPMbwa2J0fVxgMeR3tR3W+GmH9h6ENOI4AOHf1Wvgp2l3TbyPi+1r14HdN09zE8Pvf67Kg5K6maW6bprlpmub/IuJN5Nzz3caxgt1NQlus3+sOyx6apvk4Wk9aqvtuxrHwY0IbcI66HDs3D6/XM/k5qZ1zrcbWNuZyyF5xrQR2k9TcJrpd95biXYdlx4h7zVaBdU0mqshmhhQASCCJDQBmIpFtMm2DeaMEMWqQJCsgexHdpiiYVTlWtmsbQN8nTYPw0H8S2lhb4iAApOmYwBYR8eax6Qzr/e/QJJtFJbLdaZrmfRxfjA1NBnh0+3GWuiSjZD1zZMjoy8USj3VYsnKsRLbt8JFFnDfqdW+f0NSujFBhf8lKt+pzh5G6kTnV+aoGb3Y85m5GGjw7OBG14360WhMlsm1CPB4ABpHEBgAzksg2ie9aLjfm6OP3ie2/XlFQ9m20f+GdGfS875DQxjahDQBYnXrP0SWB7WOLCmKvYviLo6Umsn2JYYlsBxXYuFP38bbH3m2M+1zZ1fukdlYzgAcWokslsv3CkqazEurO7bzRJeFrrMGbh8i7Bl3Euqqxddnfxop7/ZrQxmoSB4eaKJFNPB4ABpDEBgAzk8g2ulkrsUX8HiDJDFYtPihbX3rvWi4+VhW2iJwktr8mtAEAq1KrYHyIbkk0z06RlPjiaMmJbH2nijokdoX163LP/3EhUwJGxO/H+U1CU5tzqQ4DQ3V8Bo9YSBW2O3U65ENCU5drquSVoHWsb+TrRNa06hERb9cweLNjFbb3I1Vhi8jZ7mcVM5bIBgDLJokNABZAItuo2n7n/47ZiTrF1CGpuTVMkdHlpdub0XqRE5A6x+MGAN5Gt2vgm7YvR+tyr2L4S7elJrJ9jH7Tpv6S3RfWqZRyGcfpqNoaq7rLEFl9WvwAHk7eYe4OtNTlWDnUa9XSZJw31lbJa6i/tVxu1Kp79d4uMzFyDef+65bLZQ9sfSjjt227H50MiWwAsFx/mbsDAMBR0zSvSikR3UbOdnH34PxyYVNGjKZjotcU2+SnaB/kes51HIMti1ODM7uWi9+MuT82TXNbj6shzmkUN/A/NxHxr+cWyqwkWatGjB3g7ruONbxIIklNoOnyAvhL12kwm6b5Ukp5Gd2mK/2W61JKLHAazldxrM7R5bt9N05XWKEfOyy7H7G6S29N0xxKKftoX6XmMdtSymaJ35GzcZi7A8+p95CXHT6yqCps93yMiHcx/Bn8h4i4Gtybddi0XG6Kap3v43j9yoih7EopPy313F8HUWxaLv7zyFXwDgltbBLaWJ0aM3wZx+rT25FWc3bxeAAAAE5MKWVXxvX1XEaAlVK2HbbLdqI+fU78LSfpc1ellE8dvsNmgv4M3uZj93EqpZSrgZviau7vsFb2wenZ33MN3YfLQq9Z/Fkp5aIc7xcn+X1LKS96rO9brvK2Qo7S/Tz0ee4+M7/S7RmmlAWfX3t8l8dkDQRanIxtNPd3WKoy/F7wznbu7/Kcjt/1a1nwdJuJv9tu7u8yhdL+HurdRP3J+v1KKeXDFH3uo5TyW8vvMMnxlrCtv47dx6UrpVwnbMcnt3FZ8LkXAJbEdKIAsDC1isSrEVdxTqXMW3/HzEo6z8icOnNxVXHKMcC/bbn4zUSjagePeC3Ln74VALK8jm4VNL4MuY+qFQlexvDr9duyvESX99Hte53D/TnP+6HDsocJn2M6q307JDS1cz8OT+pSvfHjyFWhhrpJaqfLNlmztvds/x21F1XTNFeRV73wsiwwibSU8jraVy77aaLj7TDw82efXNU0zavIO/98y108/uy3NQA8RxIbACxQTWT7PsYr938Rx6mXTv3BeXHfr77I2Sc1t11gQK9tYt1t5Cb0PeWXhDY2CW0AwKLVJJGuSfKDpyRLTGTbLSmRrb60/NjlM2cy0IRH1GNw1+EjP43Tk1RZfdwltcP5+FtSO4ekdkZRjhXHusQ+Fn3eqAPdbhKaerHAeEmqjt9vymkMM/exRQ3erHHUtn06NE3zfsz+3F/X0AZO/XhpoyayjXmOfBES2QDgWZLYAGChmqb5GDkv8x5zDg/O37Vcbj9mJ74hMyCymBe1Hauw/bzw0d8PeaEMwDno+qLwtg6+GCw5kW1J97hdk/w2Y3SC1ehyDHZOkpxDPUdk3Pf/uKDjmnXYZDQyUfXwIbqcN/Yr+D4RCQny1alXY+tyTpws/lLP+4ek5pY2eLNLxeIpE0anTFI8abWa4JgzpLyIiMVOlQsASyCJDQAWLPFl3mNeRMS7kdpegkW+5KjV2LJeOG3qyOslaJtQdxvH6bWmsk9oY5H7EgBk6VEBKiI5gSbx3ncbCxmsUb/TocNHJM6fqbq/Xnb4yM2KBoVkJKR03T5w8kopl9EtWW/RVdju1GvnPqGpyxOfirj1PcMMU09nJgEtYvBmvU63TYw8ZA30aCljuthtQhsnof52YyaybZdUPRoAlkYSGwAs3L2XeYeRVrErpVyN1Pbc2gb0Mqab7CpzKs3Zp1eoiXSblotPXYUtY11tq/oBwFrtenzm39mdSExku6s6vISksC7Jfn8drRcsXZfqLhF5lYqmkDWAZfbnHs7Ofu4OPKNLpbHDDIlMQ2Sd4075vJE1ZW66uq/tk5pbyuDNt9H+Oj1mAtS3ZFRicw96T01kG3Ng+a6U8nqktgFg1SSxAcAK1Jd5/4jxysO/rSN4T8bSR9vWKTxukprbLCARsW1g+FBL80+mHj8AwNN+6Lj8bdM0o0xleIKJbF2S/ebuK/Ppcgx+XMmUgBERUQew3CQ0tTm151ZGddLn03pt23b4yCqqsN2p9xiHhKYul1CZdSSblsvtR+zDUzL3uVmTEWuMsW3C0X6GhNGMRKuTPmf2UX/HMRPZ3i1sulwAWARJbACwEjXw/zLGS2S7XnriV0ebDsvuR+rDczIDej/OFZitIwc3LRefK3CeMS0ZAJyk+iJ80/Fj+/ye/E9iIttFHBPZtoM71dPKKt8wg45VjSPWVYXtTtZzQJfKU5y3jOfjOaq2t9XlWLiN5CnAJ5Jx3riI9slHa7OduwNPqfc/Wfvd3IM3uyTRTR73SrrX3CS0cXISn0ke8+GEE20BoBdJbACwIiMnsl1ExIcR2p3L4kcQ1uoJWcGtWQKzNdDSpQrbzYjdecrgY0ZQCYAT1rUKW8QEL/YTqxHfJbLtBneqv33L5RZ/D8sourwc/7LGxMj67LNPaGq7gOqKLFziAL2xkhYGqd9v1+EjNzWetDYfI+c36HOfs2gd4xNzJmO+SWxrlsGbHY+3OaqwZdnM3YGlupfIdhih+VOLxwPAYJLYAGBl7iWyjTGK9sUCpqXM0jqwNXOA6X3kBcbnCOi9jvbbes7pS0ytAACP2/b4zD65D99UE1+yBnFcz5jI1vYFsqT5M1OrBG46fGSNVdjuqMbGVDZJ7YxVCX+orsfAKs8bNf6V0ffNzInsY1hFfKLex90kNTdXVb3rDsu+Gq0Xz9sPbUCS+OMSB9d8y/aE4vEAMNhf5u4AANBdDeR9X0q5jm6jb9t4W0pZ88jBO9+1XG7W0chN09yWUn6ObtUXHnMREe9ioqBZTZhrGzzfz1iFLSLi14i4HNjGJqEfALAo9Xre+YVVfZEziXq/9DIiPsXwl7bXpZS/N02TWRmkjcPE62M9uj4HzDGl2t9jWQmWu1LKTzU5Ar5lk9HIEuMi9bq96/CRQxyPmVH684S2MZnnZJ17foy8ZKol2HRYdj9SH9r6KfJilz+WUm6mOv/XRPNty8Un69cjMuKbS7rWL07yM8lDb0spH6d8xgKApZLEBgAr1jTNqxqI3CU3fR0R/5fc5tQ2LZdbQnDgfRwDqhnBoilf6KylCltEzovjTUIbALA0fV7ATH7/dO+l0YfoVznuvtellIumaaaslnGYcF2sRK14su34sYzBL6dgFxFXM/eB5doktHFIaGMMXZ7DI47bwnnjOPPAdomJiT1tOiw79+DNQynlp8gbvPk2pqt41qXPc8e9MgZvbmP+pMdFGzmR7TqO1d4A4KyZThQA1u9N5L9InGN0f7ZNy+VmDeZF/F5ZL7MayOgB6lLKpsN6llDZ75DQxt8T2gCApdn2+Mws909N09w2TfMyciqp7EopHyaciv0w0XpYF9Ni9vfjhMcv65NRBWyf0MYYfpi7Ayt2Ssl8reMTC6ns9D7y7h93NSY1qo5V2N4voDro7PHNc1HjuC8jPx7/4gTi8QAwmCQ2AFi5ER+c304RFBpDrWjQ1q+jdaSDOtXmIam5Xcdt0MeaRqNG5GxbL8kAOEV/7fGZX9J70UGtoHaT0NRlRHyaIhFmAS82WZj6rLWbuRtrdhHDK85wujYJbSwiVnBfKWUXKoQPsV1rnOsbNi2XW0RiU41d/pzY5BQJidctl7uNZcS9MuLCWdMAn7y6T38f+cfYjyd0ngKAXiSxAcAJuJfIdkhu+l1ye1Pp8iJyEQG9KjPoNdpv1/GF280CqrBlvTgeOzEQAOawyutbTWR7n9DUizgmsm0S2oIuVGEb7pSqKpGkJiZvEpraJ7SRzT4/3Klsw7b3b0uownbnfeQO3twmtfUnHRNGf65x2bkdEtoweLODGmt8Gbmx5YtYbzweAFJIYgOAEzHSCLDLMYNCI9p2WHYxAb1ajS2rP9sRf7u1VWG7M3TbCuYBwNEi7p+apnkTEa8SmnoREZ8nqGQLEfF7ks1u7n6cgE1NNDhrzl1/krE9bhcyBePv6vP9ZuZunILd2qci7ph4v4Tkqoj4PW6ZGSMaMyGxbdu3kTOoYjCDN+dRrxXfJze71ng8AKSQxAYAJ6Q+OGe8yLtvjaNU/9Zh2cUE9Ko3xKjO/wAAIABJREFUiW2l/3Y1iLJrufjNwqbOGvxbCyIBcIK2PT6zmPunOggg4/73Io4V2by8YwqvwwCJLD/M3YEFsC/90TahjY8JbWRbY2xmqV7P3YGBNh2WXdS0uPW+7ZDU3CiDN0spr6P9Nv5pIVXY7hyGNqA6cXd1BorMeG6Ecz4AZ0wSGwCcmKZpPkbuyMYxK3qNZdN2waWNrq6Bj31Sc9sRKhOstQpbRE7VGC+IAGBh6gvRjKl8LuJYkW03tE/wDIlXedb4vMq4vkto45eENtLUpJLtzN04JWufzrlLwv2SEqzuZCb7pE67WKv0tY17HZqmWUQVtnsOCW1sEto4O3VfuEls0v0NAGfrL3N3AADI1zTNVSnlu8gLcv4YeYlVU2gb0FtiMC/imPy1TWrrbSQFUWrwZNty8Z8WVoUtIuK/CW28iGWOygeAs9Y0zb6U8jIiPsXwpPPrUspdctzU9jOskwnVJMlNh4/sY3mDQ7JsI6fSyA/h2CF+T0DZJjS1tGe+rsfJ+4j49xgdWYAfI+JyYBsXpZTdTNf5DF1mH1jUwM2I4+DbUso+co7VF8m/ZZdKqUu8Nn+J4dv1Rbim9vUmjtsvq7Lz2uLxAAAA8LhSyqaU8rXkWU0Fqg7f6dPcfX1MKeU68bfbJfXpU8v1fS0L3F9KKduEbXk99/cYopRyNfD7X839HdZq6I43d//XyP6ea+g+XIwiX6xT+z1LKS9KKZ8T9tlSkq/7Lde52PtTcvTYPzdz93lMPbbHSW2nkvOMsp37eyxFKeUyYXt+mPt73FeOsZ0ufpu7z2MqpVwk/Mar3k6lfWymlIVOk15yzn2pv2U57ltt46iL3H/K8GfgUjwHD1KOzyKZNnN/JwCYmulEAeBE1SpYmaMCd4ltjaZ0C+AvtRJbRO5v97YMTCorx0S4bcvFf26aZsnbdojN3B0AAB5Xp4p/GTmVR3blOLBgcHJ+af8S+TB0XSxXfVbpklDwcYHVjbP9nNTO2qcHJMc/E9pYWgWzXcfll1gdKk2NNdwkNLXpGD9akk3bBet90eI0TbOPvApTm1LK64R23kb7KmyvEtY3hozf++8JbZytesxlnoeHVp4EgNWRxAYAJ6xpmveRFxT6LqmdsW06LPvrWJ0Yqr6suklqbhPHKRGGaDt9yW0cpy5ZnBokHWqT0AYAMKL6gvtl5EwHt4uITwmJbG0//5+B62HZuk4JmJXgtVh1CrhDQlO7jIRTVm/oy/7bWNBUonWf7pKguaj+jygrQSRjOuM5bFout/TBhW8S2xo0eLNWu2obN9snxZfGkPGbu5YO1DTNVeQNTPkhqR0AWA1JbABw+rKCe2sZ+bXpsOzSA3o/RV4ff+wb0KtV2DYtF3+z8CpsQ/u2yegEACzIocdnNsl9SNc0zW3TNN9HzqCAF3FMZBsyJZdKbGeuviDfdvjIlwW/JM+Wkax3ESupHs44SimXMTz54uPCnmd30e073Sys/6Oog/72CU1t1zZVX8fqcYuswnanVqy6SWruIoYN3uyS0LjYaodJ9w3bhDbIq9b3QpI+AOdGEhsAnLgawLjJaGslUy10KXu/9IDeIfKqLwwJ6LUN5h1qJYUlG/ybD3yBDQBLc+jxmU1yH0bTNM2ryKn0MTSR7W8tlzv0bJ/lU4XtcTeRM3jHlKLnLWMq0X8ltJGp6z59TueNc63G1iWZZQ0JjZkJYb0Gb9ZExl3LxT+eQ4K5pKnhkqfM3Sa1AwCrIIkNAM5DVlBoDck7mw7LriGg9z5yq7FtunyglHIV7bfpYkej3mNqBQAY7q9zd6CLpmneR041hIuI+Fyr1HbV6j76HF6MnqOOL8gjIm5XMDgkTa0cdZPQ1Kbn8cnK1YSLodXjF1X9sGNF9IhjFbbDKJ1ZoPpbHRKaWttUxF3icr+O1oskdZ99n9TcRUS86/G56w7LZk6BOpZ9QhtriP+uwTnF4wEgjSQ2ADgDNSj0MaGpthUk5tT6wb5OXbBo9YVOZjW21qOMayC37cjvLyt50ZYRxN0mtAEAS9Hnfmh1L1LqfcrLyElov66J/l1sWyyz+HtTett1XP6cqindyfrOPyS1w7pkTCW6tOOuaxW2pVWRm0JWgsiQaSin1mX2gTUM3Iw4/o5Zfd11GbxZZ5zYtlx8LYmiGdtyk9DG2UusxtbluAeA1ZPEBgDnIyMgu+gXll2rjK3I+8ibWqpLQO91tH8RsIbRqBE523FV1WcA4Bn/7fGZTXYnplBfJL2MnPuBt6WUVpU7OkxBuu/fHZaq48CQO1lVaVajJgbcJDS1rUkJnJehU0IeljQoq+7DXeIvi6oiN5X6m6VMRbyiamxd+rmK5PjkwZsR3c4HXZZdw+wDETmDNzcJbXCUsW+v5fwEACkksQHAmUicamHJNh2W3Y/Uh3Q1oJcZLHt2eoWOL9v2KwqYHxLaWHQyJwB0tO/xmc2KXvb+Qa3E+4/IebG7K6V8brEtti3b+2Vgf1imXXR7+XhT7//PUVYlKdXYzkhN+NoMbGZpySldk/KWVkVuSlkJIkOno53Kdu4OjOR95FZj2z63UMcqbD+tpApbRM52VPkrSdM0H2N4LHI7vCcAsB6S2ADgvAydUnTpLyu3c3dgLHWE8SGpucsWAb230f73XlrA/ymHhDaWfhwAQBd9k7m2mZ2YUk0QehnD740jjsntn56pttY2oWY/vDssUNcqbGebjJI47Van6eRYvVOrwraJbtfYRfV/BlmVK4fuR6Prel5b0WDDu3uzzAr/bX7PVhV145gUtqYKqRkDNcS9cmU8cwDA2ZDEBgDnZWh1h6VXoOoyzeMaK11kJos9GtCrgdHXLdtZUxW2SBo5u/TjgIUxpRWwZPWl4aHHR79L7sqkmqa5bZrm+8iZvvAukW378C9qlbY29w5fzrj61skqpeyiY7XoWi3wnGVVY+uaPMgKdayk9JilDcrqmkyVdcysUr123iQ0tSmlLL0a22buDowpefDmk1NLd7w+/7yye7RDQhviXrnWGIMGgNlIYgOAM1JLmJ+ykw6y1IDePqm5pwJ6XYLmrxL6MrXD0AZUdgDgxOx7fGbpL3pbaZrmVeTcz1zEMZFt9+DPH/7/Y846CeGEqcLWUWISw26t0x73sJ27AzN6N/DzX5ZUxazus7uOH1tThaixZCUiLj35tUvMaz9WJ0Y2yeDNZ/7uvrVVYcsavHku189JnEE8HgBSSWIDgPMzZGT/0qsCdAnoLf27PCYzoPengH9Nztq1/PxNUnBsaoeENjYJbQDAUvSpDrA5laTumsDwfRxfVA51XUq5f4/VdipRL7dOTB0w0uX55OAl5+8ykvkuon11aVaoJg0PHciWOX1hhq777M3KKkSNosYlMs6f22emB5/b3+buwNjqPVlWvG77jcEFUUp5He1jOm9Weowdhjagony6tcahAWByktgA4PwMCb4sPXDTZaTg0r/LN9WpO/dJzb34RkDvusPnlzbtSlsZgaMlB7bH9Pe5OwATWvVUidBR3xe/S69Y0lpNHnoZOcnur0spHzokMX1Z6cAAnqYKW383kfO81jaJlJWpFcuGVmF7X5+vF6F+p67njbU+k48h6xy65Hubcxi4GZGbXPqHimv1OGtbhe2wpEqNHR0S2lCNLddh7g4AwFpIYgOAnkop21LKVSnlau6+dNSn0sbi9RghuMoktmqU6RXqNty2/Nz7Fb9s/W9CG+cazDvX7w1w0mqFiT6JbCcxpeidpmm+RMQ/IufF72VEfGq5rOSlE1OrFHY5Pm7jmLhF/H5OyjguNt+qwsNJuI5hzyaHWF4C2GV0+077FT+Tp6sJiRnX792CK81uOiybEfeYRfLgzYfXgdfR/jhb2jmii5MdvFlKuazx+LVVW/11wGfXnJQKAJ1JYgOA/rZxTAB6e0Yl1pf80LzpsnB9SblKNaB3k9Tc/YBe29GotyGYp0ITAKfm3z0+c3IJIjV55mVMl1DUN4GQZWt7X33HlIB/dpPUzpKrKtFDKeUyhidRv1rgMdf1vCEB+s+ytskuqZ1smw7LLm3/7ioz5vSulHLRsdrhlxVXYYvISWJc6vS1P8bxfPmu/qbnYO3HMwB0IokNAPq7n8Tyz9l6Ma0lj+TczN2BiWUH9C6jfRW2nxcY8O9izX0HgLF8jH7XyJObrq9pmtumaV7FNEn7a7+v4oH6QnXX8WOSUR6oFaZuEpp6cUaDzk5erZB1PbCZRU0jGhFRE8I3HT5yqNNgc09NOjokNPXj0pJjepzHVjtwMyJ98OZFHCuwdanCljml6Rwyfv9NQhtjO6mq0E9Y9fEMAF1JYgOAHOfy0LyfuwNP+HuHZfdjdWIqiS91Io5BvLYvAm4j4n3SemeR9MJim9DGHP46dwcAWKaaSHXT46PbU00QaZrmKiJexbgJ8Dcjts08uk5v9dGUgI/KSu5Tje0E1KSiDzFsGtEvTdMsMTmla0L4miujj+1fCW1cxPLifItKqptI5n5+V72rjf3SEl17yLh3XeR0ovHHfp3LoPL/zN0BAJiSJDYA6G9z/79P9eXdA0se+bWZuwMzeBN5L1XbBkRVC6mWNjK7paUGIXnGmVxjspn2F7rrmzAytCrOYtWqLi9jnES2G8lLp6XjVGV3VGF7RNM0XyJnANJlreDFul3HsOeZu+miF6Xe5287fMQ01E97HznX7K7Tu46t676/5PhdKyMM3mxr9UmiSUl4S4153e/X5Upjc12t/ngGgC4ksQFAf5sH/7+W0d1/6/m5LwtPXuoS0Fvy92it/h5TvvQ61Iokp2Cf0IaEMOAsSKI8HwNeFm5KKV2rT61GTaT5R+S+QLqN9U9VxZ9dRreXvl9OoNrL2LKed5aWkHJnm9DGyVdbLqVcx7DKWLcR8XKhMY2usaSbhX6PRajbJiPJb1NKWVI1ti6zD8QJ7SOZgzfb+Oi6/D+llEXFvR5JWDvZZ5A79kkAzo0kNgDo4ZGH5rWM7t70/Nw+sQ+pemz3X8fox0yyRhm3sfrRqPdkbLNNQhvAcp3DiO4pLeoFCE/q+7Lw7UruhXupCX4vI7f6zSaxLZaha6KUKmzPaJrmY0QcEpo65WotJ32NrQlsu4HNvKkJyYtSr5tdE6WcN56XFbtY0mDVUz1/PWmGwZunNMBgn9DG0va7b13vflzJ9b1TIuo9Km8CcHYksQFAP48FidcwldK25+f+ndmJZJu5OzCXCQN6hzqd1qnISGTcJLSxNtu5O7BSJ/1i8YT53XKt4cUC8fu9RZ+XvxcR8SG5O4vSNM1t0zTfx3EQwVAXEfFJpcPTUUrZRbf7w9sTu78eU0ZCykWcQbWWU5OUwPZqwcda18RX01C3ULdRRuLHdkHX6W2HZfcj9WEuUw3ePLXjK2ObbRPaGNtaru994wtLjscDwCgksQFAriUFuP5kQN8OCy9dvu24/KlMqxAREXWKz8PIqzml0agROftA31GUnB/JO8CqNE3zPvpNnfmiJhyctKZp3kTEqxh+P3GXyLYb3CmW4IeOy6um1N7HyLl/X0u1lrNXSrkopXyIE05gq/viruPH/jVCV05V1jl29mpsp1zpto0JB2+e0uwDETmDN5c2XfX2kT//ccnHSe3bpufH92kdAYCVkMQGAP08NXrqesGB8X/2/NzSS5d3DaosbhqRBGMG2/Z1Gp9TkrEPLPU45zTZ34Cp9U3S2p1DUlZNingZOYk116WUdwntMJM6WGjb8WM36R05UYkJDH2ShphYKeVFRHyK7tNsPrTYBLaqa+WgpQ8uXJS6rTKe+y8XkBwz9/pnN8HgzZ9OrApbRM496lqqk19ExJLvpftezz6e4H4JAM+SxAYA/TyVTLCJBT449xzle2fpVQLWElQZTQ3OH0Zq/tRGo0bkbKttQhtT287dAXo7+/NcD9u5O3BC7H9nqGmaL9G/Euv1mSSyfYmI75Oae11K+bDgwTA8rWsVNi8lu7tJamf2qkoPLK3KzaxKKa/jmMA25N7jNpafwBbRfV9celxmibK2WddpX7N1PR5+GaUX8xsrNnUbOVPFL01GEufSngP/9sTfXS74+aPvvYepRAE4S5LYAKCf5wLNS6xAsYt+lXzW8IJlaUGVuYwx5ef+FEd7Z+3TCxiRPTkv1zkn53iMPyLjuDcF8wrVBICbnh8/+US2ek3MnD71Mo7Ti24S22Rk9ffadfyYKQE7qvfvGdWhNws7N3mWjeNxVEr5FMcBgUPuO24j4uXSE9jqPtj1e97k9+TkZU1FvJv52vxU4s7ZGHHw5s+14uepOSS0cbGwGNDmmb9/V6t5Lkat1rvp8dHD0q9lADAWSWwA0E+bB+LrpTw414BD35Gji67CVb/bkgIqs6lTfu6Tm1307z/QIaGNRRzjEzvH7zzUd3N3gN42c3fghLhWr1TTNK9CItuf1HvQT5F/nngREZ/rCy/Woetz1qHet9NdVkWSuasqZVv1/Xkp5SoiPsfwKrpfIuIftUrm0nXdB29ONMlmVHWbZZ1v5zxvrPoYT/Yqub1TrcKWNngzlrX/PfdMeRERS6ts3HfAyynHYwHgSZLYAGBcnxaSyHYd/V4e36wgANx5+55iZbF7MoMcNye+rQ4JbSzh+G5lYUE8ujPVVAf2d8hVE9n63hNel1Iyq5XNrt7f/xbj3QdcxPE54vVI7ZOkXm92HT+mCltPtSJJRiLPpiZOnYpV3veUUnallN/imBw09Du8b5rmHyuoIn9XhW3T8WPOG/1lbbs5q7GtJu4wthqj2ic2+ebEE0QPCW1sE9rI0uZY2MTxPnr2a2O919j0+KgqbACcNUlsANDPtuVydy+g2i6frgZIL3t89DbGmZ4y22buDixJckDv1Ef9ZQQq11RhS+B73fx+3dheuTKmAt0ktMG8Xkb/imy7UsrnU5gms97Xf4ppkkbelVKWVk2CP+qTaHiT3Ykzk1VV6ceFHFtnd89yL3ntOobfH9xGxPdN06whdnHnh47LH058cNmo6rY7JDU3eVK+2Qe+KStWdQ6JQoeENjKeBaf2ImZOZKvPDH0rOGZXHASAVZHEBgDju0tk20294rrOvkG2tYxG7BxMOYPpmTIC+DdrGMU+0K8JbWwT2libs3vRlmA7dwfozf5+lBH83yS0wYyaprkdOLXo3TSZq60uVqspdElgOySs9jKO2835aGHqi9EfO35sfwb32GPLmlL0IvolIWY7i+SUUsqmlHJVSvkaOclrEceExv9b0/S8NRax7fixn/N7cnb2Se1sZ4gnuf4/UBMTM477Ux+4mWUR+2CPe+EXEfHbHPfQdZ0fen78vcRlAM6dJDYA6GhABYnrKSsp1BeEfRPYPq5oNOIigilLUqeAvRnQxG0I5rW2opfKm6R2zuJF2wLZ7t1sktqx3eGBmsjWN2H+Io7VxT6vaVBBTb74HN2qKbxpmub/IueeahPHRLarhLbI8zq6XydMCTjcPrGtWauxLaQS3GjquXNXSvkUxymYM6YNjTgmCH/fNM33Kxl4d1+fqjyrSdJbsKzk14j+lZX6Wku8YWpDB29+WVHcc26bhVRT7nP9uBtYPlnS+sCqzV9CPBYAJLEBQA+bAZ+9jOMosF1OV/6slHJRSvkQEe96NvEl1lW2fDt3BxZqSNDjZxUiOtnO3YGWNknt/DWpnbOQGOz18qKbTVI79vejbUYja0pa4mlN07yP4/Sih55N3E3x82nJ+0W9r76KY/JFl/Pwq7qNommaqxi2re57WxMAXRNm1rMKW4RklMFq0tKXpOYuYvqElPvSjuWlnBdKKdtace1zHM+d15H3vHQ32Oofa6q+dqdnFbYvns1T7BPb2pZSLhPbe853E65rNepxcTOgiTVNQTxE1vVym9TOEJuen7sbRPNp7GS8HlWb77uN4zPE2pKzASCdJDYA6G7oyOGLOFZl+5yZzPbgJVvfgNptHEc0r+KBeckvPec2IKB3GxHvUztz+tYSVM5KxlnEC7IV2WQ1dOrVOpL9Lakd+zs8ok5z848YlpSzjf8ls+0SupWi3le/jv9VDmrrNo7JFTf3//Detsq4x7qblvXKdWFWfaqwfVnLc9YKZL2Uj4h4vZAKM0Ntpzwn1PPktpTyupRylxxQ4vjy/m3k30PdxPH8erXi46jPQMN9difOUd1nDolN9h002sd2wnWtTd/Bm/szmq4x61y8hLjXZuDnt3EcWH6dfd2v18OuVZsf+r7OrAEAZ+8vc3cAAFYoKwDwIo7JbG8j4uc4TuF56NpIHXH9Q0TsYliC3W1EvFzZKN9/zt2BhXsTx4TGLvvFzyt+KTCXKUdhD5F17vLCvJtNYlsvwoustjZJ7Zz9/p6cML4N+/BJqfcM39f95Dr6H3vbOCZgvItjUty/56iyU19o7eJYYavr8f8xnqieUP/8TSnlX3F8+b3t3dGjtxHxQynlzRorEq1Z3U/6vKT0YjLPf5Lbu45jxcSpbRPbehfHSjMRx2SdQ/3zQ/x5e+1btHcRf3x++Hv9s4d/PrabiPhpZXGKP6mJ2n2226/JXTlnh8h7RtiUUl7fVV0dS4339XkeWULC0eiapjmUUn6K7tdk0zV2dxnrmrXjKbuI2JVSbmLgM0c9t/8Qw6/nr84osRIAAIAx1MoHX0u+uxFhV3UU17YGraKU8uLen13V5X5LXO/qqs2U/r/B1dx9n0o57itd9oOzSdgotVpAksUnspW880WZ+7usSel2DD5nN/f3WYuSeI2e+7vMrZRymbUtyzFBiRNWjhV5so6/r6WUD6WUXRnxPrWUsqn9/jSgn697rPey5F2bPxUViidTjvtlH1dz9/1UlOMzcbbtDN/jeoTvcQq+lhEq5cylHKvW/dZzW2zn7v+pKMeKgZm+lpHjJwP6/GnMfi1JOR5fXe49P8zd5ymV3LjXrHHjcrxnz/w+d+6eOV6X4/3FN4/ruv67CqQfSt4zz27iTQkAAMCpqg+v10kPrHP6XFaYuFSOLzT7upq7/1Mp3QJ6u7n7O6WSG/y6nvv7PCfxu5aywqTXuZT+L7q/5Wru77MG5Xjey3TW+3vJTcQ8mxdq56zUKe5L/oCPr+V47X5X/veSqdPxWf44/d11GZ5Edl0G3keXYzLbp4H9uPOpnNn93NTKsOSp3dz9PxUDf4fH/DbD9/g0wvdYs8/l+Jy/uvjEU8qwe6mT2hZzGvg7PGa0OEDpnpx13+ex+rVEpdtvu5m7v1Mqx/NqlkUMSCq5A0Hm9LWceawBAACAkZRjAP3TvM+9vV3Nvf36KsMCMYtPOMpUji9qnzP5S5u5ldyX66OPwh6i5L/o2839ndai5AZXJQC1UOzvqUryPc7c34dplWMyQubLs6fcJbl965/fktf1qSS/dCrHqsvXJef+5LdyTPbzYixZGbY/b+fu/6ko4ySxlTLx8/FI32FtvpYTPl+V4+DH3ubu/ykp4ySxlTLSub20i+M8aow+LVVpX+3wrGKBEenXmUXFDct4s6RM4VNZcAwRAACAE1GOgfTMijtj+lxW/BKlDH9pcXaJIOX5gN5u7j5OqQx8mbC2bVgGBsC/YREjcJeu5FcE+zr3d1qDkv+C6qz395L/YuAkX1LztJKboDWnD2WCe+hyrDBxXfIS2q7LMaFw9L6fsjL8+rKd+zucijJeElspE1XpKcfz4rn6rRwT1y6n2NZzKgMHA8zd/1NSxktiG6XqWRmegH9WCTKl3WwNm7n7OaUyzrVyUeftMl4F6LF8LaW8nnu7AQAAcGbKMTnmXVnmA/RJPCyX4cG8s0sEKU8H9M5qqomIwdPRPmZRo1LvK/lTH5/dPtNHGSdoLAHoGSW/OurZ7u/lzBJ+mUY5Jmi9K+uZBui3cnw5tplpe23r+j+VvOeLsxvQMVTJSTi6mvt7nIoybhLbJMdHyR9ksmRfyzEJ+HU5o3vZkpM0dTbba2xJv8djrhbY121mn9agPH1veTV3/6ZWxrnOLPYeskxbAbqP63JmiZQA0FczdwcA4JSV44vaf0bE3CPVDhHxr4h43zTN7cx9GaQck/AyquL8f2vfFl3VYMkmIi4i4i4Y/l1E/NQ0zX6eXs2jlPIhxjkuXzVNczNCu4OUY+Jm6kjspmk8SzyjHAPlb5ObfdM0zfvkNk9KKflVK851f0+85t73sWma75PbZKXqvcllHO9HXsTxPmUJDhHxMSL+vbR7pHv3c9uI+Gv8755u26GZfdM0LzP7dcrqNv8cw++lnP+SjHR9um/0+60Rn0eW4Ev959c4nm++zNyfyZVjtaIPCU25909Sjsk32xFX8X9N0xyGNpJ4zTm7faduuxfxx3hXxPG+6R9nGAMca5//x5LP6+WY/PtDROwiOQ7W000c466HmfsBAKtxloF4AJhaOZbxv3tBdxnTPUTfvXy7mWh9AADQy4MErb/H8Z55O8Gq7xIufoljwsVhgnWOqj5//KGCz9IS8tbiW9uyp9slv/Rdk3vnirEcxj4P1Jfs9+MCj+1n3z34/6z9cajDvX/+E8dz6ME+fpS4j46+L56Lbxxz2b5kJEklXnPsO2duxH0+ZV+fQjlWJLwbXL6ZcNWHOMbkf3YcAkB3ktgAYAY1kLCN/KoT91/AfVxLUAEAAB7z4IXu9t5fPUzuaOOX+u8vcUwq2vfvGcD8nkh62T7xsW+dP2/jWD3toS/17yJWlLwAAHdqcvE2jte/beQntX2JiH1E/EtCNwAMI4kNABbgXtB5E/97iH7updzdC7hDHEdY7kfoGgAAAAAAnIR7sfi7inX34/DbRz62v/ffv8QxwfuLmDwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHSBLLAAAerUlEQVQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwu2buDgBwnkopLyLiYu5+AAAAAAAA8Adfmqa5nbsTAJwXSWwAzKKU8ikitnP3AwAAAAAAgD942TTNfu5OAHBe/t/cHQAAAAAAAAAAAOB8SWIDAAAAAAAAAABgNpLYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4UjN3BwAAAACylFK2EXERES/qH/313n/fRsSv9/77S0QcmqY5TNhFJlRKudsXXsRxv4iI+O7eIl8i4r/1v/dhfwAAAACAWUhiAwAAAFapJihdxjEp6S5Rqa99RBwi4peI+NI0zZeh/euiJt9tR2r+UP/50jTN7UjrWIRSyos4bsfv6r8vnlr+EYc47g+/RMTHJW2zUsrVc8s0TfPsMmN62Mcx+zPycfMlIm6bptmP1D4AAAAAAAAAAGtUStmUUl6XUj6Xcf1WSrkupVxO9L2uRv4+D7/XrhyTAFevHPeJq/rdsn2t22sz9/eMiGjT4aX1ceR1TXXcfC6lvCsTnQ8AAAAAAAAAAFigUsq2lPJhooSVh64m+H5TJeM8dF2O1axWp0y/T3wqMyeztenknP37Vh9HXtccx83Xckxo24z53QAAAADOzV/m7gAAAADAY8oxweptPD9l4MeI+HdE7JumOdTPbiJiE8cpJV9ExN/rvzcdu7GY6SRb2N/77008/113EbErpewj4tXdtluycpwy9F08v0/cRsRNRPzrbnrYe/vE3T930462sY2I30op7yPipyVNM0pvt3GcNvS+u/PFYy4i4nVEvLYvAAAAAAAAAACcsHKcIvJTi4pIV10rItW2d6V9Fa/tON/yD33qUlHqU60E9bocq5Ftnmj3RTlWW2vjaynl9djfta9SykX93m2+x1VpOV1qbXdXnt/f7vtcjsl0k2rTsan79FwfR15X2+PmczkeB1fleMw8+duV4zniXTnuS8/5ray0miEAAAAAAAAAAI+oiSbPJY+0TlJ6Zl13CUxPJbRtEr7Wc/1ok4yzG9D+5pnveN914ldLUY7JeL+16XsZsF+UY4LTp5bb6Wsp5TLze7bo37Om7E+bPo68rjbHzZD9octxs0v8agAAAAAAAAAAzKEcE8o+PZMoMloFrLr+13UdkyTh3Ft3m2ScbcJ6XrdMyFlMIls5Jhk+JzWhrG6nNlW4SpkwealNZ6bqS9s+jryuZ4+bqdYz9b4AAAAAAAAAAECycqy09VzS0LsJ+7Mtx6penyda3yRJbHVdbRPZrjLWN7Cv1y36+bmMUC2vtNsn70xSka1NR6boR5c+jryuSZLY6rqul7QvAAAAAAAAAACQqLSrtLWbqW+DpyxtuZ7Jktjq+tom5KStc6Q+fh7zNyrH6SQ/P9OHUo7JbqNUCHzQn2eN3YeufRx5XZMlsdX1tZla9GuZ6LwBAAAAAAAAAECCsuAEtim1ScYpuUlsF6VdlbFPWevs2L93Lfo2agLbvb60rcg2en9a9EES24jrL8ekxjb7wlXmegEAAAAAAAAAGEkp5bJFMshu7n5OoU0yTkmuitZynaVMUGHsQb/aJDZ+LSNMIfpEn7Ytt9WoU9626cCY6+/Tx5HXNWkSW9t1FtXYAAAAADr7f3N3AAAAADg/5ZgYdf3MYjdN09xM0J1z9b7lcpej9uKelvtFRMT3TdMcRu7O75qm2Ue77fW6zDgFK5O4abHMRUx43AAAAACcAklsAP9/e3d41daVtQF4n2/N/6GDUQehA2sqGKaCiApiVxC7ApwKIBXYqQClAnAFViowU8GeH7p8QwjSPWCdcyXxPGuxHC92OC9Xkn+9ax8AAKCrYUPRp1gXPTa5LaWcd4r0KpVS7iJiWTH6pnGUh2oKbB+HUllvHyLirmLu59ZBmM5QnrytGO35uQEAAAA4eEpsAAAAQG8XETEbmfl3hxxE/F4x0+U60cx8X3HWKtZlsu6G0t8vFaNz29iO3m8VM7PWIQAAAACOiRIbAAAA0M1Q7lmMjH3oeVXkK7esmNm2MW8nMnMWET9VjL4bymRT+Ri2sVG3iW3eOgQAAADAMVFiAwAAAHoauy5yFeuiEK/LzzFelluWUj73CLPJUKC7qhidD8U8jtOURUoAAACAo6TEBgAAAHQxXBc5Gxn7MPGmLTrLzJMY384XUXeVZw+1OWo2ywEAAAAAocQGAAAAdDAUlcZKPXcRMemmLSbxtmJmNfUWtnvDVbc110meNY4CAAAAAEdDiQ0AAADo4SzGr4u8soWtu1nFTE1h63v8WDHza+MMz7WsmJm5UvRojf1bFlH3HgEAAABgoMQGAAAA9FBzteK+FZVegx8qZpatDs/M06gr0l21yvBCv1XOzVuGYDKnFTMKuQAAAADPoMQGAAAANDUUlcZKH6tSSuuNX/xVzZWXtYWtl6jZwrYarvDcJ7Xv1TdNUzCVmvLn781TAAAAABwRJTYAAACgtZqi1LJ1CP6scgvaspSybBhjXjHzueH5LzJce7uqGJ21TcJE5hUzy8YZAAAAAI6KEhsAAADQ2r8qZmwt6q/mitcPrQ7PzJOou5ZxX98bq4qZeeMMdJaZZxFxMjJ2a7MkAAAAwPMosQEAAACt1RSVlq1D8D+ZOY+IxcjYx8Zb2GreFxH1V3f2tq/lOtqquQL3l+YpAAAAAI6MEhsAAADQzFCWGlVKWbVNwr3hGtFPI2NXpZR3jaPUlNju9vi9cVczVPsZYP8Nn52x65FvSylXHeIAAAAAHBUlNgAAAKAlW9j2yFDCuY7t1yF+LKWcd4jzj4qZfd3CFrHf2WjjomKmx2cHAAAA4OgosQEAAAAtbStL0VFmvo+Im9j8mtxFxL87bGC7V7WJrXkKqDB8fuYjY+elFOVGAAAAgBf429QBAAAAgKP2pmJG6aORzJzF+vrDnyJitmX0KiLelVL2rTT2ZeoAkJmLiPh5ZOzcNaIAAAAAL6fEBgAAAEztP1MHOBCnmVkzN4+Ivw9/jm07u4qID6WU1XfkeqnZBGfukvLlkcvMk1hfIbrYMnYX6wLoVY9MAAAAAMdKiQ0AAADgMFzs6OcsI+LXiPg88ea12YRnf7dSyl1lqZAD9GD72mzL2DLWG9hW7RMBAAAAHDclNgAAAKCl+dQBiNtYl21+j4jlHl4ZCs1k5vwZ4/OI+GH482TL3CrWGwyvXhgLAAAAgEeU2AAAAAAOw1VE/LHhez/F5tLNbSnlXZNEsP+ud/Rz7iLic0T8WkpZ7uhnAgAAADBQYgMAAAA4DBvLM5l5GxGfNvx/i8z8Ukr52CzZK5SZp1NnoKm7WG8xvN9guJw2DgAAAMBxU2IDAAAAWrqL7dfysQOllM+ZeRURiw0jF5m5KqV87pfq6FW9r5WfJvehcm41fEWstxe6dhcAAACgIyU2AAAAoKXbiJiPzLzpkGOrzFxExI/bZkop/+yT5sXexfpZzzZ8/3Iost12SwQTK6W8nzoDAAAAAOOU2AAAAADWxa/5xBm+SynlLjPPI+J6w8hJrIts/9yTLVPLOICC4xbzipll4wwAAAAAcBT+b+oAAAAAwFFbVcyctg7xWgxXV37cMnIaEZ/6pDl6f6+YWbUOAQAAAADHQIkNAAAAaOmPipmTzDxpnuSVKKW8i/U1rpvMM/OiV54tVhUz+1xwrMn2pXkKAAAAADgCSmwAAABAS9vKVA/tc1npEJ2PfP9tZi56BNmiquDYPMXL1bxnl61D7LnV1AEAAAAAOAxKbAAAAEBLtSW2ecsQr00p5TYiPoyMXWbmlOXBqvdGZs4b53i2zJzFeMHubngdXrPV1AEAAAAAOAxKbAAAAEAzpZRV1BVZ3rRN8vqUUt7H+Caw6wmvcj3kLX3zipnPrUMAAAAAwLFQYgMAAABaqynzzCcsUx2z84i42/L9k4i47pTlTw684FiT6bfmKQAAAADgSCixAQAAAK39Wjl31jTFKzQUxcauFT3NzMsOcZ6yrJiZN87wEmPv1VUppcUmtlWDn7kzT1xPu61ACQAAAAD/T4kNAAAAaKqUcht15ZsfG0d5lUopH2N8G94iM9/2yPNIzbaykyfKUZPJzLNYb7Dbpra4+VyrsYHMnDU6u8bj5/JlkhQAAAAAHBwlNgAAAKCHsW1gEesrReetg7xSY9eKRkRc9H7+w7aymm1d+1Rw/NfI9+8i4mOjs1cVM7NGZ9ewiQ0AAACAF1FiAwAAAJorpVxFXQHn57ZJXqdSyl2si2xjPk2w9eyqYmYvrprNzJOIWIyM/TI87xZqNptNubXuh0d/v50kBQAAAAAHR4kNAAAA6OVdxYxtbI0MW8+uRsZOIuJyKGv18kvFzGxP3hdjV6623MIWUVcKe1wk62n+8C+llOU0MQAAAAA4NEpsAAAAQBdDiWpZMXrROMpr9i7GN+KdRsRl+yhrpZRV1G1jm3RL31Ds+2lk7LzhFrb7UtjYz5+3On+bzJzFn68yXU6RAwAAAIDDpMQGAAAA9HQe4yWc08x83yHLq/OMa0XPOr8G76KinDXxNra3sd5Ut8nnoajZ2nLk+7MJroSN+Os1q79NkAEAAAAAAAAAAMZl5lnWOeuY6f1YmKnP32WBKzMvKl+Dxa7OrMj0tiLPda88j7LNMvPbllxfs9MVrJm5qHhO3TbpDZlOnng+sw7nTvq5BQAAAAAAAADggNWUT4ZSTJeNUlOXYSqfx3zHZ97s02swZLquyLTolacyV9dnNOT5WvGcZh3zPH7/dinRPXHuX/TIAQAAAAAAAADAgcrMy4oiTpeC0NRlmJrzc/clttOKMzP7bhl7aqPXY99y2oLW4yzdr+7Mum1snzpleep9NOt0thIbAAAAAAAAAADfJ+uLbPPGOV5die0Z52Zm3uz67C2Zasp1N9mhWJfby2KTFNgeZKvZpLdonOGp0uFFyzMfna/EBgAAAAAAAADA9xspCj30vmGGV1liG86+rnz+Xa6IHDLVvCeaFtlGMnzNCQtsQ77aTXqLhuc/LrB9bfmaPJFBiQ0AAAAAAAAAgN0YCjFfKwo5NznRRrJdn/nc81v83sPZsxy/wvPeokWGDbkWFbluskGZLDPfbjnzOjsWtbbJiQqg+fT7tftmug05/qRnHgAAAAAAAAAADlyurya8qCzlXOcOS11Tl2Fqzt/l7/vE+bVlqKY5nsj11Lavx75l5tsdnXeSmZ9an7NLz3jtvuZ3lBCHZ7PIp8umk1ytmkpsAAAAAAAAAAC0kJnzrL/i8ibXW7Nm33nmqy6xDRk2lbce+/a9z/uZubYVyx76mi8saQ1nvM/Nhbnrnr/zc+XzSojfMvMyM89ypHiW68/i2+H5b3o2kxTYhnxKbAAAAAAAAAAAtJPPK7NlrktMl0OxZT58zR79zNMH33uf681vVWc0/l33ocR2kvXXit5k5ys1c126+lqR7b6ktcgt5apcvxcWub0gd936ue/K8PvcVL5+u/IpJ7xaNZXYAAAAAAAAAADoIdflnMusL1jt0n0hqummqdyDEtuQ4+wZz+aydZ4NGTddabkrXV7zVjo8n8w9KfelEhsAAAAAAAAAAL3lumR1ke1KOl9zvV3qbXYsMdWUcbJTaWh4vrUuemTakPMsd1dufLi9bbLNYrs0/C7XO3g2j5/R3pT7UokNAAAA4GiUqQMAAAAAvMRQNjqNiHlE/CMiZg++trmNiLvh68vw521E3JZS7pqEPSDDc72J/z3H++fz+HlFKWXZP+Ff5brgN4+IHyLiZPjvTe5/l98jYhXr1/22acAJDa/nPNaflTexfj5jRbT7Z3QbEX9ExPKYnxEAAAAAAAAAALBnMnO2Txu3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgIPwXDXspNFZf18sAAAAASUVORK5CYII=';

  let pageNum = 1;

  function drawHeader() {
    bg(...green); doc.rect(0, 0, W, HDR, 'F');
    const logoW = 65, logoH = logoW * 898 / 2481;
    const logoX = (W - logoW) / 2;
    const logoY = (HDR - logoH) / 2 - 3;
    doc.addImage('data:image/png;base64,' + MOU_LOGO_B64, 'PNG', logoX, logoY, logoW, logoH);
    fg(...cream);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('GOLDEN VISA PROGRAM - MEMORANDUM OF UNDERSTANDING', W / 2, HDR - 3, { align: 'center' });
  }

  function drawFooter(n) {
    ln(...linec); doc.setLineWidth(0.25);
    doc.line(M, FTR, W - M, FTR);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('Smith & Adams Group - MOU - Golden Visa Program', M, FTR + 4.5);
    doc.text('Page ' + n, W - M, FTR + 4.5, { align: 'right' });
  }

  function drawBand(y, text) {
    bg(...green); doc.rect(M, y, cW, 7.5, 'F');
    fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(text, M + 3, y + 5.5);
    return y + 7.5;
  }

  function drawArticle(y, text) {
    fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(text, M, y);
    return y + 5.5;
  }

  function para(y, text, sz) {
    sz = sz || 8.5;
    fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(sz);
    const lines = doc.splitTextToSize(text, cW);
    doc.text(lines, M, y);
    return y + lines.length * (sz * 0.352778 * 1.42) + 1.5;
  }

  function mutedPara(y, text, sz) {
    sz = sz || 7;
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(sz);
    const lines = doc.splitTextToSize(text, cW);
    doc.text(lines, M, y);
    return y + lines.length * (sz * 0.352778 * 1.42) + 1;
  }

  /* ----------------------------------------
     PAGE 1
  ---------------------------------------- */
  pageNum = 1;
  drawHeader();
  drawFooter(pageNum);

  let y = BOD + 4;

  /* OBJECTIVE */
  y = drawBand(y, 'OBJECTIVE');
  y += 2;
  y = para(y,
    "Smith & Adams One FCR is a Regulated Venture Capital Fund with a total size of 50,000,000 EUR. " +
    "The Fund's flagship project is the Beato Urban Collection, a residential development incorporating " +
    "a hospitality element, located in the Beato district of Lisbon. The project comprises 206 serviced " +
    "apartments ranging in size from 41m2 to 43m2. Delivery is scheduled for mid-2027.", 8.5);
  y += 4;

  /* INVESTMENT FUND DATA */
  y = drawBand(y, 'INVESTMENT FUND DATA');
  y += 2;

  const fdLW = cW * 0.50;
  const fdRH = 7;
  const fundData = [
    ['Fund Name',               'Smith & Adams One FCR'],
    ['Type',                    'Regulated Venture Capital Fund'],
    ['Fund Size',               '50,000,000 EUR'],
    ['Management Company',      'TLG SGOIC, S.A.'],
    ['Custodian Bank',          'Bison Bank, S.A.'],
    ['Auditor',                 'Oliveira, Reis & Associados, SROC, Lda.'],
    ['Legal Advice',            'Viola Advogados'],
    ['Subscription Start Date', 'July 2025'],
    ['Investment Period',       '96 months (8 years)'],
    ['Annual Management Fee',   '1.25%'],
    ['Performance Fee',         '0%'],
  ];
  fundData.forEach((row, i) => {
    bg(...(i % 2 === 0 ? [255, 255, 255] : sand));
    doc.rect(M, y, cW, fdRH, 'F');
    ln(...linec); doc.setLineWidth(0.2);
    doc.rect(M, y, cW, fdRH, 'S');
    doc.line(M + fdLW, y, M + fdLW, y + fdRH);
    fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(row[0], M + 3, y + 5);
    fg(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(row[1], M + fdLW + 3, y + 5);
    y += fdRH;
  });
  y += 4;

  /* INVESTMENT TERMS & CONDITIONS */
  y = drawBand(y, 'INVESTMENT TERMS & CONDITIONS');
  y += 2;

  const itcH = 8;
  bg(...green); doc.rect(M, y, cW, itcH, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  const itcC1 = cW * 0.30;
  const itcC2 = cW * 0.30;
  doc.text('Component',       M + 3,                 y + 5.5);
  doc.text('Description',     M + itcC1 + 3,         y + 5.5);
  doc.text('Min. Investment', M + itcC1 + itcC2 + 3, y + 5.5);
  doc.text('EUR',             W - M - 3,             y + 5.5, { align: 'right' });
  y += itcH;

  const itcRow = (comp, desc, min, eur, alt) => {
    const rH = 10;
    bg(...(alt ? sand : [255, 255, 255]));
    doc.rect(M, y, cW, rH, 'F');
    ln(...linec); doc.setLineWidth(0.2);
    doc.rect(M, y, cW, rH, 'S');
    fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(comp, M + 3, y + 6.5);
    doc.text(desc, M + itcC1 + 3, y + 6.5);
    fg(...muted);
    doc.text(min, M + itcC1 + itcC2 + 3, y + 6.5);
    fg(...ink); doc.setFont('helvetica', 'bold');
    doc.text(eur, W - M - 3, y + 6.5, { align: 'right' });
    y += rH;
  };

  itcRow('Minimum Investment for Golden Visa', 'Participation Units - Smith & Adams One FCR', '250,000 EUR', '250,000 EUR', false);
  const totalAmtDisplay = data.totalAmount ? ('EUR ' + data.totalAmount) : fmtEUR(grandTotal);
  itcRow('Total Investment Amount', '(eligible for Golden Visa)', totalAmtDisplay, totalAmtDisplay, true);
  y += 4;

  /* PARTIES */
  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('BETWEEN:', M, y);
  y += 6;

  const half = cW / 2;
  bg(...green); doc.rect(M, y, cW, 7, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('SMITH & ADAMS CAPITAL, S.A.', M + 3,        y + 5);
  doc.text('THE INVESTOR',               M + half + 3, y + 5);
  ln(...linec); doc.setLineWidth(0.2);
  doc.line(M + half, y, M + half, y + 7);
  y += 7;

  const sellerPLines = [
    'Smith & Adams Capital, S.A.',
    'NIPC 518910911',
    'Avenida Jose Malhoa, no 14 - 7th Floor,',
    '1070-158 Lisbon',
  ];
  const buyerPLines = [
    data.investorName || '___________________',
    'Passport: ' + (data.passport || '___________________'),
    'Nationality: ' + (data.nationality || '___________________'),
    'Number of Applicants: ' + (data.applicants || '1'),
  ];
  const pRowH = Math.max(sellerPLines.length, buyerPLines.length) * 4.8 + 6;
  bg(...cream); doc.rect(M, y, cW, pRowH, 'F');
  ln(...linec); doc.setLineWidth(0.2);
  doc.rect(M, y, cW, pRowH, 'S');
  doc.line(M + half, y, M + half, y + pRowH);
  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(sellerPLines, M + 3,        y + 5);
  doc.text(buyerPLines,  M + half + 3, y + 5);
  y += pRowH;

  /* ----------------------------------------
     PAGE 2
  ---------------------------------------- */
  doc.addPage(); pageNum = 2;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  /* PAYMENT PLAN */
  y = drawBand(y, 'PAYMENT PLAN');
  y += 2;

  const ppC0 = 0.15 * cW;
  const ppC1 = 0.25 * cW;
  const ppC2 = 0.20 * cW;
  const ppC3 = 0.20 * cW;

  bg(...green); doc.rect(M, y, cW, 7, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('Phase',       M + 3,                              y + 5);
  doc.text('Description', M + ppC0 + 3,                       y + 5);
  doc.text('Amount (EUR)',M + ppC0 + ppC1 + 3,                y + 5);
  doc.text('Deadline',    M + ppC0 + ppC1 + ppC2 + 3,         y + 5);
  doc.text('Notes',       M + ppC0 + ppC1 + ppC2 + ppC3 + 3, y + 5);
  y += 7;

  const gvPpRow = (phase, desc, amount, deadline, notes, alt) => {
    const rH = 11;
    bg(...(alt ? sand : [255, 255, 255]));
    doc.rect(M, y, cW, rH, 'F');
    ln(...linec); doc.setLineWidth(0.2);
    doc.rect(M, y, cW, rH, 'S');
    fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(String(phase), M + ppC0 / 2, y + 7, { align: 'center' });
    fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    if (desc)     doc.text(desc,     M + ppC0 + 3,                              y + 7);
    if (amount)   doc.text(amount,   M + ppC0 + ppC1 + 3,                       y + 7);
    if (deadline) doc.text(deadline, M + ppC0 + ppC1 + ppC2 + 3,                y + 7);
    if (notes)    doc.text(notes,    M + ppC0 + ppC1 + ppC2 + ppC3 + 3,         y + 7);
    y += rH;
  };

  gvPpRow(1, data.pp1desc, data.pp1amount, data.pp1deadline, data.pp1notes, false);
  gvPpRow(2, data.pp2desc, data.pp2amount, data.pp2deadline, data.pp2notes, true);
  gvPpRow(3, data.pp3desc, data.pp3amount, data.pp3deadline, data.pp3notes, false);
  gvPpRow(4, data.pp4desc, data.pp4amount, data.pp4deadline, data.pp4notes, true);
  gvPpRow(5, data.pp5desc, data.pp5amount, data.pp5deadline, data.pp5notes, false);

  y += 8;

  /* DETAILED FEES & COST BREAKDOWN */
  y = drawBand(y, 'DETAILED FEES & COST BREAKDOWN');
  y += 2;

  const fcRH = 7.5;
  const fc1  = M;
  const fc2  = M + cW * 0.55;
  const fc3  = W - M;

  bg(...green); doc.rect(fc1, y, cW, fcRH, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('Included Cost Items', fc1 + 3, y + 5.5);
  doc.text('Coverage Period',     fc2 - 2, y + 5.5, { align: 'right' });
  doc.text('Total (EUR)',          fc3 - 2, y + 5.5, { align: 'right' });
  y += fcRH;

  const fcSec = (lbl) => {
    bg(...sand); doc.rect(fc1, y, cW, 6, 'F');
    fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text(lbl, fc1 + 3, y + 4.5);
    y += 6;
  };

  const fcRow = (desc, period, total, sub) => {
    bg(...(sub ? sandL : [255, 255, 255]));
    doc.rect(fc1, y, cW, fcRH, 'F');
    fg(...ink); doc.setFont('helvetica', sub ? 'bold' : 'normal'); doc.setFontSize(8.5);
    doc.text(desc, fc1 + 3, y + 5.5);
    if (period) { fg(...muted); doc.setFont('helvetica', 'normal'); doc.text(period, fc2 - 2, y + 5.5, { align: 'right' }); }
    fg(...ink); doc.setFont('helvetica', sub ? 'bold' : 'normal');
    doc.text(total, fc3 - 2, y + 5.5, { align: 'right' });
    ln(...linec); doc.setLineWidth(0.2);
    doc.line(fc1, y + fcRH, fc3, y + fcRH);
    y += fcRH;
  };

  fcSec('PARTICIPATION UNITS');
  fcRow('Smith & Adams One FCR - Participation Units', '96 months (8 years)', fmtEUR(participationUnit));

  fcSec('PROPERTY ACQUISITION COSTS');
  fcRow('IMT - Property Transfer Tax',   '6.5%',    fmtEUR(transferBase));
  fcRow('Stamp Duty (IS)',               '0.8%',    fmtEUR(stampDutyBase));
  fcRow('Notary and Registration Fees',  '23% VAT', fmtEUR(notary));
  fcRow('Acquisition Subtotal',          '',        fmtEUR(acqTotal), true);

  fcSec('FUND & ADMINISTRATIVE COSTS');
  fcRow('Asset Management Fees',             fmtPct(c.fundMgmtRate, 2) + ' p.a. x ' + c.fundMgmtYears + 'y', fmtEUR(mgmt));
  fcRow('CMVM Registration and Supervision', c.cmvmYears + ' years',     fmtEUR(cmvm));
  fcRow('Fund Auditor Fees',                 c.auditYears + ' years',    fmtEUR(audit));
  fcRow('Fund Subscription Fee',             '',                         fmtEUR(subscription));
  fcRow('S&A Administration',               c.snaAdminYears + ' years', fmtEUR(snaAdmin));
  fcRow('Fund Subtotal',                     '',                         fmtEUR(fundTotal), true);

  fcSec('LEGAL & GOVERNMENT FEES');
  fcRow('Legal advisory services',       'incl. VAT',   fmtEUR(legalAdvisory));
  fcRow('AIMA and Biometric Fees (main)', 'per person',  fmtEUR(govMain));
  if (deps > 0) fcRow('AIMA and Biometric Fees (dependents)', deps + ' persons', fmtEUR(govDeps));
  fcRow('Legal Subtotal',                '',            fmtEUR(legalTotal), true);

  bg(...green); doc.rect(fc1, y, cW, fcRH + 2, 'F');
  fg(...cream); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Total Programme Cost', fc1 + 3, y + 6);
  doc.text(fmtEUR(grandTotal),     fc3 - 2, y + 6, { align: 'right' });

  /* ----------------------------------------
     PAGE 3 - Articles
  ---------------------------------------- */
  doc.addPage(); pageNum = 3;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = drawBand(y, 'TERMS AND CONDITIONS');
  y += 5;

  y = drawArticle(y, 'Article 1 - Investment and Subscription of Fund Units');
  y = para(y,
    "Upon execution of this agreement and transfer of the agreed-upon investment amount, the Client " +
    "shall subscribe to fund units in Smith & Adams One FCR for the sole purpose of qualifying for " +
    "the Portuguese Golden Visa program. From the subscription date onwards, the client shall assume " +
    "all rights and obligations inherent to the status of fund participant, in accordance with the " +
    "applicable regulations and laws.", 8.5);
  y += 3;

  y = drawArticle(y, 'Article 2 - Repurchase of Participation Units and Return of Capital');
  y = para(y,
    "Unless otherwise agreed in writing, after a period of no less than five years from the investment " +
    "date, or upon verification of Portuguese citizenship or permanent residence eligibility, the Fund " +
    "shall redeem the Client's subscribed participation units. The client will be entitled to receive " +
    "100% of the invested capital, plus a fixed return of up to 3.5% per annum.", 8.5);
  y += 3;

  y = drawArticle(y, 'Article 3 - Secured Amount');
  y = para(y,
    'For this Memorandum of Understanding to be valid and legally binding, the prospective investor ' +
    'must provide a security deposit of EUR 20,000 (twenty thousand euros). This deposit will be ' +
    'deducted from the total investment amount owed by the prospective investor and will not be an ' +
    'additional cost. Should the prospective investor decide not to proceed, or withdraw their ' +
    'application to the investment fund, the secured amount shall be non-refundable.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 4 - Golden Visa Conditions and Refunds');
  y = para(y,
    "Both parties acknowledge that a fundamental condition of this agreement is the client's intention " +
    "to obtain Portuguese residency and/or nationality through the Golden Visa programme. Smith & Adams SA " +
    "undertakes to reimburse the Client in full for all amounts paid under this Agreement, including the " +
    "deposit, if the Golden Visa application is not pre-approved by the Portuguese immigration authorities. " +
    "This refund will be provided on the condition that the refusal is due to reasons directly attributable " +
    "to Smith & Adams SA.", 8.5);
  y += 3;

  y = drawArticle(y, 'Article 5 - Construction Delay, Grace Period, Force Majeure and Buy-Back Right');
  y = para(y,
    'In the event of a construction delay, the Seller shall benefit from a grace period of ' +
    'ninety (90) calendar days after the estimated completion date, during which no penalties, ' +
    'compensation, or liabilities shall apply.', 8.5);
  y = para(y,
    'Should the construction delay exceed the ninety (90) day grace period, the Seller shall ' +
    'pay the Buyer compensation in the amount of EUR 600 (six hundred euros) per month, ' +
    'calculated on a pro-rata daily basis, for a maximum period of seven (7) months.', 8.5);
  y = para(y,
    'If the delay exceeds seven (7) months after the expiration of the grace period, the ' +
    'Buyer shall have the right to resell the Property back to the Seller. In such case, ' +
    'the Seller shall be obligated to repurchase the Property from the Buyer, reimbursing ' +
    'the full purchase price paid by the Buyer together with all documented acquisition-related ' +
    'costs reasonably incurred by the Buyer up to that date, within sixty (60) days from ' +
    "receipt of the Buyer's written notice exercising such right.", 8.5);
  y = para(y,
    'The Seller shall not be held liable for any construction delays, non-performance, or ' +
    'failure to comply with the estimated completion timeline arising from events of Force ' +
    'Majeure. Force Majeure shall include, but not be limited to, acts of God, natural ' +
    'disasters, war, terrorism, civil unrest, governmental actions or restrictions, changes ' +
    'in applicable laws or regulations, labor strikes, shortages of materials, supply chain ' +
    'disruptions, pandemics, banking disruptions, delays caused by public authorities, utility ' +
    'failures, or any other circumstances beyond the reasonable control of the Seller.', 8.5);
  y += 3;

  y = drawArticle(y, 'Article 6 - Governing Law and Jurisdiction');
  y = para(y,
    'This Memorandum of Understanding (MOU) and any dispute, controversy, claim, or ' +
    'obligation arising out of or in connection with it, including its validity, ' +
    'interpretation, execution, breach, or termination, shall be governed by and construed ' +
    'in accordance with the laws of the Portuguese Republic.', 8.5);
  y = para(y,
    'The Parties agree that any disputes arising from or related to this Agreement shall be ' +
    'submitted to the exclusive jurisdiction of the courts of Lisbon, Portugal, expressly ' +
    'waiving any other jurisdiction that may otherwise apply.', 8.5);
  y = para(y,
    'Prior to initiating any judicial proceedings, the Parties shall use their best efforts ' +
    'to resolve any dispute amicably and in good faith within a period of thirty (30) days ' +
    'from written notification of such dispute by one Party to the other.', 8.5);

  /* ----------------------------------------
     PAGE 4 - Signatures
  ---------------------------------------- */
  doc.addPage(); pageNum = 4;
  drawHeader(); drawFooter(pageNum);
  y = BOD + 4;

  y = drawBand(y, 'SIGNATURES');
  y += 8;

  const sigLW = cW / 2;
  const sigH  = 46;

  bg(...cream); ln(...linec); doc.setLineWidth(0.3);
  doc.rect(M, y, cW, sigH, 'FD');
  doc.line(M + sigLW, y, M + sigLW, y + sigH);

  fg(...accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('THE INVESTOR',               M + 3,          y + 7);
  doc.text('SMITH & ADAMS CAPITAL, S.A.', M + sigLW + 3,  y + 7);

  ln(...ink); doc.setLineWidth(0.4);
  doc.line(M + 3,         y + 30, M + sigLW - 3, y + 30);
  doc.line(M + sigLW + 3, y + 30, W - M - 3,     y + 30);

  fg(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Signature',   M + 3,         y + 35);
  doc.text('Signature',   M + sigLW + 3, y + 35);

  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(data.investorName || '___________________', M + 3, y + 40);
  fg(...muted); doc.setFontSize(7.5);
  doc.text('SMITH & ADAMS CAPITAL, S.A.', M + sigLW + 3, y + 40);
  doc.text('NIPC 518910911',              M + sigLW + 3, y + 44);

  y += sigH + 8;

  fg(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Date: _____ / _____ / _______', M,           y);
  doc.text('Date: _____ / _____ / _______', M + sigLW,   y);
  y += 14;

  ln(...linec); doc.setLineWidth(0.25);
  doc.line(M, y, W - M, y);
  y += 5;
  mutedPara(y,
    'Smith & Adams is the commercial name under which Margem Vigilante Investimentos Imobiliarios, LDA operates. ' +
    'This Memorandum of Understanding is indicative and does not constitute a legally ' +
    'binding contract. All values are subject to confirmation upon formal agreement. ' +
    'Smith & Adams Group - geral@smithandadams.com', 7);

  doc.save('Smith-Adams-GV-MOU.pdf');
}

/* ============================================================
   LEGAL DOCUMENTS — PASSWORD-PROTECTED SECTION
   ============================================================ */
const LEGAL_PASSWORD = '20SA06malhoa14';

function isLegalAuthenticated() {
  try { return sessionStorage.getItem('sna_legal_auth') === '1'; } catch (_) { return false; }
}

function openLegalOverlay() {
  const overlay = document.getElementById('legal-overlay');
  const gate    = document.getElementById('legal-gate');
  const content = document.getElementById('legal-content');
  if (!overlay) return;

  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  const fabGroup = document.getElementById('fab-group');
  if (fabGroup) fabGroup.style.display = 'none';

  if (isLegalAuthenticated()) {
    gate.hidden    = true;
    content.hidden = false;
  } else {
    gate.hidden    = false;
    content.hidden = true;
    const pw = document.getElementById('legal-pw');
    if (pw) setTimeout(() => pw.focus(), 60);
  }
}

function closeLegalOverlay() {
  const overlay = document.getElementById('legal-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = '';
  const fabGroup = document.getElementById('fab-group');
  if (fabGroup) fabGroup.style.display = '';
}

function initLegalDocs() {
  const btnLegal  = document.getElementById('btn-legal');
  const gateForm  = document.getElementById('gate-form');
  const gateError = document.getElementById('gate-error');
  const pwInput   = document.getElementById('legal-pw');
  const gate      = document.getElementById('legal-gate');
  const content   = document.getElementById('legal-content');
  const overlay   = document.getElementById('legal-overlay');

  if (!btnLegal || !overlay) return;

  btnLegal.addEventListener('click', openLegalOverlay);
  document.getElementById('btn-close-gate').addEventListener('click', closeLegalOverlay);
  document.getElementById('btn-close-docs').addEventListener('click', closeLegalOverlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLegalOverlay();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeLegalOverlay();
  });

  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pwInput.value === LEGAL_PASSWORD) {
      try { sessionStorage.setItem('sna_legal_auth', '1'); } catch (_) {}
      gate.hidden    = true;
      content.hidden = false;
      if (gateError) gateError.hidden = true;
    } else {
      if (gateError) gateError.hidden = false;
      pwInput.value = '';
      pwInput.focus();
    }
  });

  if (pwInput) pwInput.addEventListener('input', () => {
    if (gateError) gateError.hidden = true;
  });

  overlay.querySelectorAll('.legal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.legal;
      overlay.querySelectorAll('.legal-tab').forEach((t) => {
        t.classList.toggle('is-active', t.dataset.legal === name);
        t.setAttribute('aria-selected', String(t.dataset.legal === name));
      });
      overlay.querySelectorAll('.legal-panel').forEach((p) => {
        p.hidden = p.dataset.legalPanel !== name;
      });
    });
  });
}

/* ============================================================
   AI ANALYSIS — OPEN-ACCESS SECTION
   ============================================================ */

function openAIOverlay() {
  const overlay = document.getElementById('ai-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  const fabGroup = document.getElementById('fab-group');
  if (fabGroup) fabGroup.style.display = 'none';
}

function closeAIOverlay() {
  const overlay = document.getElementById('ai-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = '';
  const fabGroup = document.getElementById('fab-group');
  if (fabGroup) fabGroup.style.display = '';
}

function initAIAnalysis() {
  const btnAI  = document.getElementById('btn-ai');
  const overlay = document.getElementById('ai-overlay');
  if (!btnAI || !overlay) return;

  btnAI.addEventListener('click', openAIOverlay);

  document.getElementById('btn-close-ai').addEventListener('click', closeAIOverlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAIOverlay();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeAIOverlay();
  });

  overlay.querySelectorAll('[data-ai]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.ai;
      overlay.querySelectorAll('[data-ai]').forEach((t) => {
        t.classList.toggle('is-active', t.dataset.ai === name);
        t.setAttribute('aria-selected', String(t.dataset.ai === name));
      });
      overlay.querySelectorAll('[data-ai-panel]').forEach((p) => {
        p.hidden = p.dataset.aiPanel !== name;
      });
    });
  });
}
