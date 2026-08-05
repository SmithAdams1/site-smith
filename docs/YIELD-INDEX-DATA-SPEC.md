# Yield Index / Performance Brief — what the data has to look like

**Date:** 2026-08-05
**Why this exists:** the immersive centrepiece of the reformulated site is the group's own performance data (see `BENCHMARK-AND-POSITIONING-2026-08-05.md` §6). This document says exactly what is needed to build it, and what cannot be faked.

---

## 0. What the Brand Book already committed to

Not my invention — these are the definitions already published in Edition 03:

| Asset | Brand Book | Cadence |
|---|---|---|
| **Portugal Residential Performance Brief** | p28 · "Twelve pages, same tables every time: net yield by district, occupancy, renovation cost per m², time to let, and what moved. Free, named registration, no gate on the PDF." | Quarterly · Feb, May, Aug, Nov, second week (p41) |
| **The Yield Index** | p39 · "An annual, methodologically published index of net residential yields by district. Owned intellectual property that others must cite." | Annual · launch late January (p41) |
| **Deal files** | p39 · "One asset, fully opened: purchase price, works, overruns, letting timeline, current net. **Including the ones that underperformed.**" | Quarterly · 4 pages + film |
| **The Cost Line** | p39 · "What this bathroom, roof or lift actually cost this month." | Fortnightly · 60–90 s |

Binding rules that constrain all of it:

- p20 — *"Figures carry a date and a source in the footnote. A number without a date does not go out."*
- p52 *do not* — *"Publish a figure without a date and a source."*
- p37 — US-facing: returns shown in euro **and** dollar, with the rate and date stated. No projected returns.
- p48 — GDPR-first: lawful basis on every record, consent logged.

---

## 1. Where the systems stand today

Checked, 2026-08-05:

| System | Holds | Useful for the Index? |
|---|---|---|
| `sa-property-management` | Clients, properties (city/postal/type), appointments, inspection reports, room templates, component catalogue, photos | **No.** It is a condition-reporting tool. No rent, no lease dates, no occupancy, no costs. |
| `sa-crm` | Leads, grading, lifecycle, routing, tasks, mailboxes | **No.** Demand side only. |
| `site-smith` Supabase | `pages`, `posts`, `site_content` (+ `properties` / `re_page` created outside migrations) | **No.** Marketing content only. |

So this is a **data-collection task before it is a build task.** Nothing needs to be integrated; something needs to be assembled.

---

## 2. The atomic record

Everything — Index, Brief, Deal file — aggregates from **one row per unit per quarter**. Get this right once and all four assets fall out of it.

A spreadsheet is a perfectly good first source. One row per unit per quarter, these columns:

### Identity and location
| Column | Notes |
|---|---|
| `unit_ref` | Internal only, never published |
| `freguesia` | **The publishable grain.** Santa Maria Maior, Beato, Marvila, Arroios… |
| `municipality` | Lisboa, Porto, Cascais… |
| `project` | Building or development name. Needed for Deal files, optional for the Index |
| `typology` | T0, T1, T2, T3… |
| `area_m2` | State whether gross or useful, and stay consistent |
| `tenure` | `owned` or `managed_on_behalf` — this drives §4 |

### Capital in
| Column | Notes |
|---|---|
| `acquisition_date` | |
| `purchase_price_eur` | |
| `acquisition_costs_eur` | IMT, stamp duty, notary, legal |
| `works_cost_eur` | Total capex |
| `works_budget_eur` | So the **overrun** can be published, which p39 explicitly requires |
| `works_start_date`, `works_end_date` | |

### Income
| Column | Notes |
|---|---|
| `listed_date` | Date first marketed |
| `lease_start_date`, `lease_end_date` | |
| `contracted_rent_monthly_eur` | |
| `collected_rent_period_eur` | **Actual, not contracted.** The gap between the two is the honest part |
| `void_days_period` | |

### Operating costs for the period — this is the whole differentiator
Everyone publishes gross. Net is what nobody else has.

`management_fee_eur` · `condominium_eur` · `imi_eur` · `insurance_eur` · `maintenance_planned_eur` · `maintenance_reactive_eur` · `utilities_owner_eur` · `letting_commission_eur` · `accounting_legal_eur` · `other_eur` (with a note)

### Provenance
| Column | Notes |
|---|---|
| `as_at_date` | The date the figure is true as of. Non-negotiable per p20 |
| `source` | `own_portfolio`, `managed_on_behalf`, `registry`, `estimate` |
| `verified_by` | Who signed it off |

## 3. What gets computed, not supplied

Do **not** send these — they are derived, and deriving them centrally is what makes the method defensible and repeatable:

- **Gross yield** = contracted annual rent ÷ (purchase price + acquisition costs)
- **Net yield** = (collected annual rent − total operating costs) ÷ total capital in *(purchase + acquisition + works)*
- **Occupancy %** = (period days − void days) ÷ period days
- **Time to let** = `lease_start_date` − `listed_date`, in days
- **Renovation cost per m²** = works cost ÷ area
- **Overrun** = works cost ÷ works budget − 1
- **What moved** = this period against the same period last year

The definition of net yield above is a choice, and the published methodology has to state it: capital in the denominator including works, collected rent rather than contracted in the numerator. That is the conservative reading, and it is the one that survives scrutiny from a US investor's adviser.

---

## 4. Two constraints that decide feasibility

### Minimum n per district
A `freguesia` with one unit in it identifies a specific owner and a specific tenancy. That is personal data under GDPR, and p48 commits the group to a lawful basis on every record.

**Proposal: publish a district only at n ≥ 5**, state `n` beside every district figure, and roll everything below the threshold into an "other" bucket. Stating `n` is not a weakness; it is what makes it an index rather than an anecdote — Knight Frank states its sample too.

### Managed-on-behalf units are not the group's data to publish
`tenure = managed_on_behalf` units belong to third-party owners. Even aggregated, publishing their unit economics needs a basis — a clause in the management contract, or consent. Worth checking with whoever drafted those contracts **before** the numbers go into a public index.

If consent is not available, the Index runs on `owned` units only. That is smaller but clean.

---

## 5. The realistic sequence — start with the Deal file, not the Index

An Index needs *breadth*: several districts, n ≥ 5 in each, and ideally a prior period so "what moved" exists. If the portfolio is concentrated (largely Urban Collection in Beato, say), an "index by district" would be one project wearing an index's clothes — and that is exactly the kind of claim the brand exists to not make.

A **Deal file** needs *depth on one asset*, and that data certainly exists:

> One unit or one building: purchase price, acquisition costs, what the works were budgeted at, what they actually cost, why they overran, when it was listed, when it let, what it collects, what it costs to run, what it nets today. As at a date, signed by a name.

That single document is:
- publishable now, with no aggregation and no GDPR threshold problem (own asset, own numbers);
- the strongest possible scroll-driven page — a real building, from purchase to let, with the cost line on screen;
- the thing no competitor will match, because none of them owns the asset;
- and per p28 it *"does the work of a campaign — it feeds PR, social, the investor list and every sales conversation for ninety days."*

So: **Deal file first (Q1), Brief second (once two quarters of records exist), Index annually (once breadth allows).** The Brand Book's own calendar puts the Index in late January, which gives time to build the record.

---

## 6. What I need from you

**To build the pipeline and the page, minimum viable:**
1. One filled spreadsheet at the grain in §2. Even **one building, all its units, two quarters** is enough to ship the Deal file and prove the format.
2. The `owned` vs `managed_on_behalf` split, and whether managed data may be published in aggregate.
3. Confirmation of the net-yield definition in §3, or your correction to it.
4. A name to put on the figures. p31 requires named spokespeople; p20 requires a verifier.

**Questions only you can answer:**
5. Where does this live today — spreadsheets, the accountant, the property manager's own system?
6. How many units, across how many `freguesias`? This decides Index vs Deal file (§5).
7. How far back do usable records go? Without a prior period there is no "what moved".
8. Who signs off publication each quarter? The Brand Book says Brand & Communications reviews the figures quarterly.

**What I will build once (1) exists:**
- A `portfolio_periods` table in Supabase at the §2 grain, with the derived metrics as a view so the method is one definition in one place.
- A CSV import so the quarterly update is a paste, not a project.
- The scroll-driven page: figures server-rendered into the HTML (mandatory — AI crawlers do not execute JavaScript), motion animating what is already there.
- The `Dataset` + `Report` JSON-LD so the Index is machine-citable, which is the whole AEO point.

---

## 7. The thing to decide with open eyes

Lisbon net yields are around 2–3% in 2026 and rents fell year-on-year in several central districts (see the benchmark doc §4). **The first Brief will not be good news.** The Brand Book chose this deliberately — *"publishing an underperforming asset once a year buys more credibility than a year of good news"* — but it is worth being certain, because the first edition sets the precedent and the group cannot publish selectively afterwards without losing the only thing the strategy is buying.
