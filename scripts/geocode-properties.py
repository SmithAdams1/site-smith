#!/usr/bin/env python3
"""Fill properties.latitude/longitude for published listings that have none.

The EGO feed import left coordinates empty (4 of 2171 had them), which the
map search needs. Geocodes "address, city, Portugal" with Nominatim (OSM),
1 request/second as its usage policy requires, with a JSON cache so a re-run
only asks for addresses it has not seen. Each city is geocoded once as a
fallback: a street result more than MAX_KM from its city centre (a common
street name matched in the wrong town) is replaced by the city centre.

    python3 scripts/geocode-properties.py            # dry run, prints counts
    python3 scripts/geocode-properties.py --write    # PATCH the rows

Needs the service-role key in .env.local (read via /tmp/sbkey.py helper or
SUPABASE_SERVICE_ROLE_KEY).
"""
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

SB = 'https://bcjtkfipcfvvitglgpys.supabase.co/rest/v1/'
CACHE = Path(os.environ.get('GEOCODE_CACHE', Path(__file__).resolve().parent.parent / '.geocode-cache.json'))
UA = 'SmithAdams-site-geocoder/1.0 (geral@smithandadams.com)'
MAX_KM = 35


def service_key():
    k = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if k:
        return k
    sys.path.insert(0, '/tmp')
    from sbkey import service_key as sk
    return sk()


KEY = service_key()
HDR = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY}


def sb_get(q):
    return json.load(urllib.request.urlopen(urllib.request.Request(SB + q, headers=HDR)))


def sb_patch(q, body):
    req = urllib.request.Request(SB + q, data=json.dumps(body).encode(), method='PATCH',
                                 headers={**HDR, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    urllib.request.urlopen(req)


cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
last = [0.0]


def nominatim(q):
    if q in cache:
        return cache[q]
    wait = 1.1 - (time.time() - last[0])
    if wait > 0:
        time.sleep(wait)
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
        {'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'pt'})
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30))
        res = [float(r[0]['lat']), float(r[0]['lon'])] if r else None
    except Exception as e:
        print('  ! nominatim error', q, e, flush=True)
        res = None
    last[0] = time.time()
    cache[q] = res
    CACHE.write_text(json.dumps(cache, ensure_ascii=False))
    return res


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def main():
    write = '--write' in sys.argv
    rows, off = [], 0
    while True:
        chunk = sb_get(f'properties?status=eq.published&latitude=is.null&select=id,address,city,region&order=id&limit=1000&offset={off}')
        rows += chunk
        off += 1000
        if len(chunk) < 1000:
            break
    print(len(rows), 'rows without coordinates', flush=True)

    groups = {}
    for r in rows:
        addr = re.sub(r',?\s*Portugal\s*$', '', (r['address'] or '').strip())
        key = (addr, (r['city'] or '').strip(), (r['region'] or '').strip())
        groups.setdefault(key, []).append(r['id'])
    print(len(groups), 'distinct addresses', flush=True)

    stats = {'street': 0, 'city': 0, 'none': 0}
    for n, ((addr, city, region), ids) in enumerate(groups.items(), 1):
        centre = nominatim(f'{city}, {region}, Portugal') if city else None
        point = None
        if addr and addr.lower() != city.lower():
            q = addr if city.lower() in addr.lower() else f'{addr}, {city}'
            point = nominatim(q + ', Portugal')
            if point and centre and km(point, centre) > MAX_KM:
                point = None
        kind = 'street' if point else ('city' if centre else 'none')
        point = point or centre
        stats[kind] += len(ids)
        if point and write:
            for i in range(0, len(ids), 200):
                part = ids[i:i + 200]
                sb_patch('properties?id=in.(' + ','.join(map(str, part)) + ')',
                         {'latitude': round(point[0], 6), 'longitude': round(point[1], 6)})
        if n % 50 == 0:
            print(f'{n}/{len(groups)} {stats}', flush=True)
    print('done', stats, '(written)' if write else '(dry run)', flush=True)


if __name__ == '__main__':
    main()
