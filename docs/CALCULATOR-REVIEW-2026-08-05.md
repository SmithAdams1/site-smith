# The calculator, reviewed — and what it means for the Yield Index

**Date:** 2026-08-05
**Reviewed:** `/calculator` (`index.html`, `app.js`), `Beato_Independent_STR_Yield_Analysis.pdf`, `Beato_5_Year_Appreciation_Yield_Study.pdf`
**Why:** Abílio pointed me here expecting the data would clarify the Yield Index question. It did — but not in the direction expected.

---

## 0. First, a correction to what I told you earlier

In the benchmark I compared the group's 7% and 10.38% figures against Lisbon's ~4.3% gross / 2–3% net and implied they were far above market. **That comparison was wrong on one line.** The 10.38% is a **short-term rental** return, and STR returns are legitimately much higher than long-term buy-to-let. The market data I cited is long-term buy-to-let data, so it is not the right comparator for the Urban Collection model.

The long-term figures still stand for long-term lets, and still matter — they are the alternative an investor weighs, and they are what a district-level Index would measure. But I should not have set them against the STR number as if they were the same product.

What follows is the review with that corrected.

---

## 1. Where the numbers come from

The 10.38% is fully traceable, which is to its credit:

| | |
|---|---|
| Purchase price | €280,000 |
| ADR | €140 |
| Occupancy | 72% |
| Gross revenue | €36,792 |
| Management fee (21% of gross) | €7,726 |
| "Net revenue" | €29,066 |
| **"Net ROI"** | **€29,066 ÷ €280,000 = 10.38%** |

Scenarios: conservative €125 / 68% → 8.75%; professional €140 / 72% → 10.38%; optimised €155 / 75% → 11.97%. The arithmetic checks out, and `app.js` uses exactly `rentalYield: 0.1038`.

The appreciation study then compounds 7% a year for five years: €280,000 → €392,715, and reports **"Total Return on Initial Investment 92.16%"** (€145,330 rental + €112,715 capital gain).

*(Minor inconsistency worth fixing: the PDF compounds appreciation; `app.js` applies it linearly — `apprPerYear = property × rate` — so the calculator and the study do not produce the same five-year value.)*

## 2. The problem is the word "net", not the arithmetic

€29,066 is **revenue after the management fee**. It is not net, and it is not a yield. The following are not deducted anywhere:

- IMI (municipal property tax)
- Condomínio
- Insurance
- Utilities — in STR the owner pays electricity, water and internet
- Linen, consumables, cleaning supplies
- **Furniture and equipment, and its replacement.** STR wears out fast; a furnished unit is a recurring capital cost, not a one-off
- Maintenance and repairs
- AL licensing and compliance costs
- Accounting
- **Income tax**

And the **denominator is wrong for an ROI**: €280,000 is the purchase price alone. Real capital in also includes IMT at 6.5% (≈€18,200), stamp duty at 0.8% (≈€2,240), notary and legal, and furnishing an STR unit (realistically €15,000–25,000). Total capital in is nearer **€320,000–330,000**, which on the same €29,066 gives roughly **8.8–9.1% before any of the missing costs above.**

So the honest version of that table produces a materially lower number. How much lower is a question for whoever holds the actual operating costs — which is exactly the data the Index needs (§5).

## 3. The regulatory gap is the largest single risk, and neither document mentions it

Short-term rental in Lisbon is governed by *Alojamento Local* containment rules, tightened in November 2025 and in force through 2026:

- A parish or neighbourhood reaching a **10% AL ratio** enters **absolute containment** — new AL registrations suspended. **5%** triggers **relative containment**.
- **Beato is in relative containment.** New AL registrations there require **case-by-case authorisation from the Câmara Municipal de Lisboa**. They are not automatic and not guaranteed.
- **The ratios are recalculated monthly by the CML**, so a neighbourhood's classification can change between one publication and the next. Beato can move to absolute containment.
- In absolute containment zones, **an AL licence does not transfer on sale** — it expires with the transaction and no new one is issued while the ratio stays above threshold. (National exceptions exist for succession and divorce; a commercial sale is not one of them.)

The consequence for the Urban Collection proposition is direct: **an investor buying a Beato unit in order to earn STR income may not be able to obtain the licence required to earn it.** The entire 10.38% depends on a discretionary municipal authorisation that neither the calculator nor either study mentions.

This is not an obscure risk. The Brand Book itself lists *"short-let licensing and what it did to real occupancy"* as a live 2026 topic (p32). The group knows it matters; the investor-facing material does not say so.

I am not giving legal advice here — Beato's current ratio and the CML's present position need confirming with the council or with counsel, and they change monthly. That is precisely the point: a number that depends on a monthly municipal recalculation cannot be published as a flat projection.

## 4. Both studies fail the Brand Book's own evidence rule

Each is titled *"Independent"*. Neither names an author, a firm, a signatory or a date. Each lists AirDNA, Airbtics, INE and Turismo de Portugal under "Independent Sources", but **no individual figure is attributed to any of them** and there are no access dates.

Against Edition 03:

| Rule | Where | Status |
|---|---|---|
| "Figures carry a date and a source in the footnote. A number without a date does not go out." | p20 | ✗ |
| *Do not:* "Publish a figure without a date and a source." | p52 | ✗ |
| *Do not:* "Lead with residency, scarcity or lifestyle promises." | p52 | ✗ (D2/GV framing) |
| "Guaranteed returns" → write "Occupancy above 90% for three years" | p21 | ✗ |
| Paid media "never runs… a guaranteed return or a residency headline" | p33 | ✗ |
| US market: **"No projected returns"**, no "passive income" framing, all US-facing copy reviewed by counsel quarterly. *"We advertise real estate and management services, not securities."* | p37 | ✗ |
| Third pillar of the brand: **"Reported, not promised"** | p18 | ✗ |

Describing a document you produced yourself as "independent" to a US investor audience is its own exposure, separate from the numbers.

Two further notes:

- **The Golden Visa tab projects returns on a fund participation** (€250,000 per unit; two units to reach the €500,000 statutory minimum). A projected return on a fund participation, marketed to US persons, is much closer to the territory p37 explicitly warns about than a property is. This one deserves counsel review before the redesign, not after.
- **The calculator is off-brand visually too.** Its palette is cream `#F2EDE3`, forest green `#3D4F45`, gold `#B89968`. The brand is navy `#11222D`, white, stone, slate. It reads as a different company.

---

## 5. What this actually means for the Yield Index — the real finding

Abílio's hope was that the calculator would supply the data. It does not, and the reason matters:

> **The calculator contains the group's assumptions. The Index requires the group's measurements.**

`rentalYield: 0.1038` and `appreciationRate: 0.07` are hardcoded constants traced back to an Excel. They are what the group *projects*, not what its units *collected*. The Index needs collected rent, actual operating costs, actual void days, actual time-to-let, as at a date, signed by a name — none of which exists in the calculator.

**And here is the consequence that outranks the redesign:**

Publishing a truthful net-of-cost Index would immediately contradict the calculator sitting on the same domain. You cannot run *"Reported, not promised"* as a brand pillar and a 92%-five-year-return projector at `/calculator` simultaneously. The first Brief that shows real net figures makes the projection look like what it is.

**One of the two has to change, and the Brand Book already chose which.**

## 6. The way through, which is cheaper than it sounds

Do not delete the calculator. Split it.

**Keep the cost half — it is genuinely useful and genuinely factual.** IMT at 6.5%, stamp duty at 0.8%, notary, legal, fund management fee at 1.25%, capital gains at 19%. These are real, checkable, dated rates, and a buyer's-cost calculator is a legitimate, valuable, brand-compliant tool. No competitor in the p35 table offers one honestly.

**Replace the return half with measured performance.** Instead of *"projected net ROI 10.38%"*:

> **Unit 101, Beato · Q2 2026.** ADR €138. Occupancy 71%. Gross €9,180. Management fee €1,928. IMI €142. Condomínio €180. Utilities €320. Maintenance €0. **Net €6,610.** Net on capital in (€318,400): 8.3% annualised. AL registration: authorised, relative containment zone. As at 30 June 2026. Verified by [name].

That is the Deal file from the data spec. It is *more* persuasive than the projection, not less, because it is checkable — and it is the one thing none of the four competitor types in p35 can produce, because none of them owns the asset.

**And where a scenario tool is still wanted**, label it a scenario, give it a downside case, put the licensing condition on the face of it, and date the assumptions. The Brand Book's voice rule is the test: *"Occupancy above 90% for three years"* is publishable; *"projected 10.38% net"* is not.

---

## 7. Immediate items, in order of exposure

1. **The AL licensing condition** is missing from investor-facing material for an STR-dependent proposition in a relative-containment zone. Highest exposure, cheapest fix: state it.
2. **"Net ROI" is not net, and the denominator excludes acquisition costs and furnishing.** Relabel, or recompute properly.
3. **"Independent" with no named author or date.** Either name the independent party or drop the word.
4. **The Golden Visa fund projection** — counsel review, per the group's own p37 rule.
5. `app.js` linear vs PDF compounded appreciation — pick one.
6. Calculator palette off-brand — folds into the redesign, no urgency.

---

### Sources

- Lisbon AL containment rules 2026 — [GuestReady](https://www.guestready.com/pt/blog/novas-areas-de-contencao-al-lisboa/), [ECO](https://eco.sapo.pt/2025/11/19/lisboa-alarga-restricoes-ao-alojamento-local-com-uma-analise-bairro-a-bairro/), [Executive Digest](https://executivedigest.sapo.pt/lisboa-aperta-regras-do-alojamento-local-seis-freguesias-e-nove-bairros-entram-em-contencao-absoluta/), [Imóveis em Portugal](https://imoveisemportugal.com/novas-licencas-alojamento-local-permanecem-suspensas-em-lisboa/), [CML — Alojamento Local](https://www.lisboa.pt/cidade/economia-e-inovacao/setores-estrategicos/alojamento-local?L=1)
- Golden Visa fund minimum €500,000 — [Global Citizen Solutions](https://www.globalcitizensolutions.com/portugal-golden-visa-changes/)
- Long-term Lisbon yields, for contrast only — [Investropa](https://investropa.com/blogs/news/lisbon-rental-yields-apartment), [Portugal Resident](https://www.portugalresident.com/rental-property-returns-start-falling-throughout-portugal-lisbon-leads-decline/)
