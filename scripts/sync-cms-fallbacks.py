#!/usr/bin/env python3
"""Sync each page's inline HTML fallback with the live EN value in site_content.

WHY THIS EXISTS
---------------
Copy is applied client-side by cms-loader.js. AI crawlers — GPTBot, ClaudeBot,
PerplexityBot — do not execute JavaScript at all, and Google's non-JS pass sees
the same thing. What they index is therefore the inline fallback in the HTML,
not what a reader sees.

On 2026-08-05 those fallbacks had drifted badly: the homepage advertised
+10 / +500 / +€30M instead of 1,000+ / €300M+ / 300+, the H1 still read "the most
exclusive opportunities reach you first", the Golden Visa page still described the
closed real-estate route, and urban-collection.html served LOREM IPSUM. 118 keys
across 9 pages were stale.

Run this after any batch of CMS edits. It replicates applyValue() from
cms-loader.js exactly, so the fallback and the rendered result are identical.

    python3 scripts/sync-cms-fallbacks.py --dry-run     # report only
    python3 scripts/sync-cms-fallbacks.py --write       # apply

Keys with no row in site_content keep their existing fallback, which is correct:
the fallback is the only source for them.

The durable fix is to render site_content server-side; until then this keeps the
indexable copy honest. Verify afterwards by loading a page with requests to
supabase.co blocked — that is exactly what a crawler reads.
"""
import argparse, html as htmlmod, json, os, re, sys, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co'
VOID = {'img', 'source', 'input', 'br', 'hr', 'meta', 'link'}

PAGES = ['index.html', 'about.html', 'contact.html', 'invest-in-portugal.html',
         'our-developments.html', 'property-management.html', 'urban-collection.html',
         'real-estate.html', 'blog.html']


def anon_key():
    src = open(os.path.join(REPO, 'cms-loader.js'), encoding='utf-8').read()
    return re.search(r"SUPABASE_ANON_KEY = '([^']+)'", src).group(1)


def fetch_en():
    key = anon_key()
    url = f'{SUPABASE_URL}/rest/v1/site_content?select=key,value&locale=eq.en&limit=5000'
    req = urllib.request.Request(url, headers={'apikey': key, 'Authorization': 'Bearer ' + key})
    rows = json.loads(urllib.request.urlopen(req, timeout=30).read())
    return {r['key']: r['value'] for r in rows if r['value'] is not None}


def open_tag_at(src, attr_pos):
    """From a position inside an open tag, return (tag_start, tag_name, open_end)."""
    start = src.rfind('<', 0, attr_pos)
    m = re.match(r'<\s*([A-Za-z][\w:-]*)', src[start:])
    if not m:
        raise AssertionError(f'not a tag: {src[start:start + 40]!r}')
    i, q = start + 1, None
    while i < len(src):
        c = src[i]
        if q:
            if c == q:
                q = None
        elif c in '"\'':
            q = c
        elif c == '>':
            return start, m.group(1).lower(), i + 1
        i += 1
    raise AssertionError('unterminated tag')


def close_pos(src, name, from_pos):
    """Matching close tag for `name`, honouring same-name nesting."""
    depth, pos = 1, from_pos
    pat = re.compile(r'<\s*(/?)' + re.escape(name) + r'(?=[\s/>])', re.I)
    while True:
        m = pat.search(src, pos)
        if not m:
            raise AssertionError(f'no matching </{name}>')
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return m.start()
        pos = m.end()


def set_attr(tag, attr, value):
    v = value.replace('"', '&quot;')
    pat = re.compile(r'(\s' + re.escape(attr) + r'\s*=\s*)(["\'])(.*?)\2', re.I | re.S)
    if pat.search(tag):
        return pat.sub(lambda m: m.group(1) + m.group(2) + v + m.group(2), tag, count=1)
    return tag[:-1].rstrip() + f' {attr}="{v}">'


def renders_as_html(value):
    """The same auto-detection cms-loader.js applies before choosing innerHTML."""
    return bool(re.search(r'<[a-z][\s\S]*?>', value, re.I)
                or re.search(r'&[a-zA-Z]+;|&#\d+;', value))


def kind_of(tag_name, tag_src):
    attr = re.search(r'data-cms-attr\s*=\s*["\']([^"\']+)["\']', tag_src)
    attr = attr.group(1) if attr else None
    if re.search(r'data-cms-type\s*=\s*["\']stars["\']', tag_src):
        return 'stars'
    if attr in ('bg', 'href', 'src', 'html'):
        return attr
    if tag_name in ('img', 'source', 'iframe', 'video'):
        return 'src'
    if tag_name == 'a':
        return 'href'
    return 'text'


def sync_page(path, cms, write):
    src = open(path, encoding='utf-8').read()
    changed, pos = [], 0
    while True:
        match = re.compile(r'data-cms\s*=\s*"([^"]+)"').search(src, pos)
        if not match:
            break
        key = match.group(1)
        tag_start, name, open_end = open_tag_at(src, match.start())
        # The attribute must lie INSIDE the open tag we just resolved. If it does
        # not, this occurrence is a false positive — `data-cms="..."` appearing as
        # text, e.g. inside an inline <script> that builds markup as a string.
        # Walking back from such text lands on the enclosing <script>, whose close
        # tag can sit BEFORE the match, which would rewind `pos` and spin forever.
        if not (tag_start < match.start() < open_end) or name in ('script', 'style'):
            pos = match.end()
            continue
        tag_src = src[tag_start:open_end]
        kind = kind_of(name, tag_src)
        if key not in cms or kind == 'stars':
            pos = open_end
            continue
        value = cms[key]
        if kind in ('href', 'src', 'bg'):
            if kind == 'bg':                      # style-only; nothing to write in source
                pos = open_end
                continue
            new_tag = set_attr(tag_src, kind, value)
            if kind == 'src' and re.search(r'\ssrcset\s*=', tag_src, re.I):
                new_tag = set_attr(new_tag, 'srcset', value)
            if new_tag != tag_src:
                src = src[:tag_start] + new_tag + src[open_end:]
                changed.append(key)
                open_end = tag_start + len(new_tag)
            pos = open_end
            continue
        if name in VOID:
            pos = open_end
            continue
        close = close_pos(src, name, open_end)
        payload = value if (kind == 'html' or renders_as_html(value)) \
            else htmlmod.escape(value, quote=False)
        if src[open_end:close].strip() != payload.strip():
            src = src[:open_end] + payload + src[close:]
            changed.append(key)
            close = open_end + len(payload)
        pos = max(close, match.end())   # progress is guaranteed, never rewind
    if changed and write:
        open(path, 'w', encoding='utf-8').write(src)
    return changed


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--dry-run', action='store_true')
    g.add_argument('--write', action='store_true')
    args = ap.parse_args()

    cms = fetch_en()
    print(f'site_content EN rows: {len(cms)}\n')
    total = 0
    for page in PAGES:
        path = os.path.join(REPO, page)
        if not os.path.exists(path):
            print(f'{page:28} MISSING', file=sys.stderr)
            continue
        changed = sync_page(path, cms, args.write)
        total += len(changed)
        flag = '' if changed else '  (in sync)'
        print(f'{page:28} {len(changed):3} keys{flag}')
        for k in changed:
            print(f'      · {k}')
    print(f'\ntotal: {total} keys ' + ('written' if args.write else 'would change (dry run)'))
    if total and args.dry_run:
        print('Re-run with --write to apply.')


if __name__ == '__main__':
    main()
