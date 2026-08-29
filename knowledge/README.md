# Smith & Adams - Knowledge Base

Single, vetted source of truth for all Smith & Adams content (site copy, table/block copy, articles, guides, papers, email marketing). The `sa-content` skill (`.claude/skills/sa-content`) reads from here so every piece is consistent and accurate.

## How to use
- Each topic doc is the ONLY place a fact should live. Write copy by pulling from these docs, never from memory or guesswork.
- Every doc has a `Last verified:` date and a `Sources:` list. If a fact has no source, it is marked `TO VERIFY` and must not be published.
- When you learn/confirm a fact, update the relevant doc (and its date), don't scatter it.

## Accuracy policy (YMYL - this is finance + legal)
Golden Visa and Portuguese tax rules change often and are OUTSIDE the model's training. Treat every legal/tax/eligibility fact as `TO VERIFY` until checked against CURRENT 2026 official sources (AIMA, Portal das Finanças, the relevant law/decree, or a named adviser). Known moving parts:
- The Golden Visa real-estate route (direct property purchase) was REMOVED in Oct 2023. Current qualifying routes differ (funds, etc.). VERIFY what S&A actually offers under €280k before publishing that figure as a GV route.
- NHR was closed to new entrants and replaced by the IFICI ("NHR 2.0") regime from 2024. VERIFY current terms.
Always date public claims ("as of 2026") and add a "not legal/tax advice" line on legal/tax content.

## Docs
- `company.md` - who S&A is, business units, positioning.
- `proof-points.md` - the numbers and how to state them.
- `golden-visa.md` - Portugal Golden Visa (routes, eligibility, process). TO VERIFY heavy.
- `d2-visa.md` - D2 (entrepreneur/business) visa. TO VERIFY heavy.
- `invest-in-portugal.md` - the investment case (market, real estate, yields).
- `taxation.md` - NHR/IFICI, property/rental tax, structuring. TO VERIFY heavy.
- `portugal-vs-other-countries.md` - comparison vs Spain/Greece/Malta/etc.

## Sources to load (Abílio to provide)
Brand Book Ed.03; any legal/fiscal memos; current site copy; adviser notes; official AIMA / Finanças pages. List them in each doc's `Sources:` as they come in.
