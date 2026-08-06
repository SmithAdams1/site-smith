#!/usr/bin/env python3
"""List the copy on a redesigned page that is hardcoded — i.e. has no data-cms hook.

WHY THIS EXISTS
---------------
The brand rollout rewrites pages with new copy taken from the Brand Book, and
in doing so drops the data-cms hooks the old markup carried. That is a
deliberate deferral: the backoffice is being redesigned at the end of the
rollout, and the keys will be defined then against the new copy, not the old.

The cost of deferring is that someone has to find every hardcoded string again
later. This script removes that cost: run it per page and it emits the copy
that needs a key, with a proposed key name following the existing convention
(<page>.<section>.<item>.<field>), ready to paste into site_content.

It reads the RENDERED DOM with the CMS request blocked, so what it reports is
exactly the text a visitor and a crawler see, not an approximation from regex
over the source.

    python3 scripts/cms-rehook-manifest.py index.html                # needs a
    python3 scripts/cms-rehook-manifest.py index.html about.html     # local
                                                                     # server on
                                                                     # :5183

Output is markdown on stdout. Redirect it into docs/ and commit it.
"""
import json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, "/private/tmp/claude-501")  # cdp helper lives outside the repo

WALK = r"""
(() => {
  const TEXT_TAGS = new Set(['H1','H2','H3','H4','H5','P','LI','BLOCKQUOTE','FIGCAPTION','SPAN','DT','DD','TD','TH','BUTTON','A']);
  const SKIP_IN   = new Set(['SCRIPT','STYLE','NAV','HEADER','FOOTER']);
  const out = [];
  const seen = new Set();

  function sectionOf(el) {
    const s = el.closest('section,[data-section],main>div');
    if (!s) return 'page';
    return (s.id || (s.className || '').toString().split(/\s+/).filter(c => c && !/^(rd-)?(container|wrap|inner|grid|row)$/.test(c))[0] || 'section')
      .replace(/^rd-/, '').replace(/[^a-z0-9]+/gi, '_').toLowerCase().slice(0, 28);
  }

  document.querySelectorAll('*').forEach(el => {
    if (!TEXT_TAGS.has(el.tagName)) return;
    if (el.closest('[data-cms]')) return;              // already covered by a hook
    if (el.hasAttribute('data-cms')) return;
    for (const p of SKIP_IN) if (el.closest(p)) return;
    // only leaf-ish nodes: no child that is itself a text tag we would report
    if ([...el.children].some(c => TEXT_TAGS.has(c.tagName))) return;
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length < 3 || t.length > 600) return;
    if (/^[\d\s.,:/|·—–-]+$/.test(t)) return;          // pure punctuation/numbering
    const key = sectionOf(el) + '|' + el.tagName.toLowerCase();
    if (seen.has(key + '|' + t)) return;
    seen.add(key + '|' + t);
    out.push({ section: sectionOf(el), tag: el.tagName.toLowerCase(), text: t });
  });
  return JSON.stringify(out);
})()
"""

FIELD = {'h1': 'title', 'h2': 'title', 'h3': 'title', 'h4': 'subtitle', 'h5': 'subtitle',
         'p': 'body', 'li': 'item', 'blockquote': 'quote', 'figcaption': 'caption',
         'span': 'label', 'dt': 'label', 'dd': 'value', 'button': 'cta_label', 'a': 'cta_label',
         'td': 'cell', 'th': 'header'}


def run(pages, port):
    import cdp
    rows = {}
    for page in pages:
        c = cdp.Chrome()
        try:
            c.call("Page.enable"); c.call("Runtime.enable"); c.call("Network.enable")
            c.call("Network.setBlockedURLs", urls=["*supabase.co*"])
            c.call("Emulation.setDeviceMetricsOverride", width=1440, height=900,
                   deviceScaleFactor=1, mobile=False)
            c.call("Page.navigate", url=f"http://localhost:{port}/{page}")
            c.wait_event("Page.loadEventFired"); time.sleep(1.5)
            rows[page] = json.loads(c.eval(WALK))
        finally:
            c.close()
    return rows


def main():
    pages = sys.argv[1:] or ['index.html']
    port = os.environ.get('PORT', '5183')
    rows = run(pages, port)

    print("# CMS re-hook manifest\n")
    print("Copy that is currently hardcoded and will need a `site_content` key when the")
    print("backoffice is redesigned. Regenerate with `scripts/cms-rehook-manifest.py`.\n")
    print("Proposed keys follow the existing convention and are a starting point, not a")
    print("decision — group them the way the new backoffice will present them.\n")
    for page, items in rows.items():
        stem = re.sub(r'\.html$', '', page).replace('-', '_')
        stem = 'index' if stem == 'index' else stem
        print(f"\n## `{page}` — {len(items)} strings\n")
        print("| proposed key | text |")
        print("|---|---|")
        counters = {}
        for it in items:
            field = FIELD.get(it['tag'], 'text')
            base = f"{stem}.{it['section']}.{field}"
            n = counters.get(base, 0)
            counters[base] = n + 1
            key = base if n == 0 else f"{base}{n}"
            text = it['text'].replace('|', '\\|')
            if len(text) > 150:
                text = text[:150] + '…'
            print(f"| `{key}` | {text} |")
    total = sum(len(v) for v in rows.values())
    print(f"\n**Total: {total} strings across {len(rows)} page(s).**")


if __name__ == '__main__':
    main()
