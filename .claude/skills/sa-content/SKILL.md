---
name: sa-content
description: Create Smith & Adams content (site copy, block/table copy, articles, guides/papers, email marketing) about Portugal investment, Golden Visa, D2, taxation, and Portugal-vs-other-countries. Invoke whenever writing S&A-branded informational or marketing content so voice, proof points, SEO/GEO structure, and legal/tax accuracy stay consistent.
---

# Smith & Adams content

You are writing for Smith & Adams, an independent Lisbon-based group advising international (mainly US) investors on Portugal. Purpose of every piece: genuine informational value for investors AND strong SEO + GEO (generative-engine) optimisation.

## Step 0 - always read the facts first
The source of truth is the repo's `knowledge/` directory. Before writing, read the relevant doc(s): `company.md`, `proof-points.md`, `golden-visa.md`, `d2-visa.md`, `invest-in-portugal.md`, `taxation.md`, `portugal-vs-other-countries.md`.
- Pull every fact from there. Do NOT invent or rely on training memory for numbers, rules, minimums, timelines.
- Anything marked `TO VERIFY` (or any legal/tax/eligibility fact without a dated source) must NOT be stated as fact. Either omit it, or write a bracketed placeholder `[TO VERIFY: ...]` and tell the user what to confirm.
- This is YMYL (finance + legal). Golden Visa and Portuguese tax rules change and are outside model training. Two known traps: the direct real-estate Golden Visa route was removed Oct 2023; classic NHR was replaced by IFICI from 2024. Never write around these without verified current facts.
- On any legal/tax content, include the dated disclaimer from the relevant knowledge doc ("as of 2026, not legal/tax advice...").

## Voice
- Senior investor-advisory: measured, credible, specific, no hype. "Advisers, not brokers." "A single mandate: your outcome."
- Active voice; concrete over clever. Write from the investor's side.
- Proof points, stated exactly: 1,000+ investors advised, €300M+ in advised assets, 300+ assets under management. Never invent more precise numbers.
- Language: English by default; European Portuguese when asked. In BOTH languages, NEVER use em-dashes (—); use hyphens or restructure. (Em-dashes read as AI and Abílio has flagged this repeatedly.)
- Positioning is independence: where a competitor or alternative is genuinely better on a dimension, say so - it builds the trust the whole brand rests on.

## SEO
- One clear primary keyword per page + a small set of secondary/long-tail; place primary in title, H1, first 100 words, and one H2.
- Title < ~60 chars, meta description ~150 chars, both compelling not stuffed.
- Logical H1 > H2 > H3 outline; short paragraphs; descriptive anchor text; internal links to the relevant pillar/related pieces.
- E-E-A-T for YMYL: name a credible author/expert, cite official sources (AIMA, Portal das Finanças, INE, Banco de Portugal), date the content, link primary sources.
- Add FAQ (schema-ready Q&A) and, where relevant, HowTo/Article structured data suggestions.

## GEO (generative-engine optimisation)
- Front-load a crisp, quotable answer/definition near the top (LLMs extract these).
- Use clear factual statements, dated ("as of 2026"), with the entity named explicitly (avoid pronouns that lose context when a snippet is lifted).
- Favour structured, extractable blocks: comparison TABLES, numbered steps, definition lists, tight Q&A.
- State numbers with units and source/date inline. Comparison tables (Portugal vs Greece/Spain/Malta; D2 vs Golden Visa) are prime GEO assets.
- Make each section self-contained so it survives being quoted alone.

## Output formats (ask which if unclear)
- **Block/table copy** for the site builder (about/invest pages use `docs/*.blocks.json`; Studio pages use the `site_content`/blocks system). Keep to the block's field lengths.
- **Article / pillar page**: title + meta + H-outline + body + FAQ + internal-link + source list + suggested schema.
- **Guide / paper (lead magnet / email)**: cover blurb, contents, sectioned body, CTA to /lp-invest or a consultation; noindex if gated.
- **Email marketing**: subject + preview + short body + single CTA; segment-aware (Benjamin's US investor pipeline). Coordinate with the CRM/GA4 tracking already in place.

## After writing
- List which `knowledge/` facts you used and any `[TO VERIFY]` items the user must confirm before publishing.
- If you learned/confirmed a durable fact, update the relevant `knowledge/` doc (and its `Last verified:` date) rather than leaving it only in the draft.
