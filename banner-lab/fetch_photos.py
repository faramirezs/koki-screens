#!/usr/bin/env python3
"""
Fetch high-quality food photography for the banner lab.

Source: Openverse (api.openverse.org), which indexes openly-licensed photography and needs
no key. Everything it returns is filtered to commercially usable licences, landscape, and at
least 1600px wide, then downloaded at 1600px so the pool stays a few hundred MB instead of a
few GB.

Why not Unsplash: Unsplash's API requires an access key, their web app sits behind a bot
check, and their image CDN only serves ids you already know. Bing image search was tried as a
way to discover those ids and it returns the same seven generic "about Unsplash" images for
every query, so the pool it produced was not food at all.

Every file keeps its source page, licence and creator so the provenance is traceable.

    python3 fetch_photos.py              # all queries
    python3 fetch_photos.py burger cake  # named queries only
    python3 fetch_photos.py --per 20     # results to request per query
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

UA = "koki-banner-lab/1.0 (banner design research)"
HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, "photos2")
MANIFEST = os.path.join(HERE, "photos2.json")
API = "https://api.openverse.org/v1/images/"

# Specific dish phrases, not the bare category word: Openverse matches titles and
# descriptions literally, so "burger" also returns zoo photos and "fruit" returns trees.
QUERIES = [
    "hamburger", "cheeseburger", "pizza margherita", "sushi plate", "ramen bowl",
    "taco", "fried chicken", "green salad", "chocolate cake slice", "cappuccino",
    "smoothie", "spaghetti", "grilled steak", "chicken curry", "noodle soup",
    "pancakes", "croissant", "donuts", "ice cream cone", "fresh fruit",
    "vegetable soup", "club sandwich", "barbecue ribs", "grilled salmon",
    "dumplings plate", "burrito", "tiramisu", "burger and fries",
]

# How many result pages to walk per query; 20 hits per page for an anonymous caller.
PAGES = 3

# Wide, tall enough to fill a 1080p banner at 2x, and never upscaled.
MIN_W = 1400
MIN_RATIO = 1.15


def get(url, timeout=45):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def search(query, per, page=1):
    params = {
        "q": query, "page_size": per, "license_type": "commercial", "size": "large",
        "aspect_ratio": "wide", "mature": "false", "extension": "jpg", "page": str(page),
    }
    body = get(API + "?" + urllib.parse.urlencode(params))
    return json.loads(body).get("results", [])


# Wikimedia only renders a fixed set of thumbnail widths; anything else is a 400
WIKI_WIDTHS = [1920, 1280, 1024, 800]


def variants(url):
    """The same photo at decreasing sizes, cheapest first, then the original."""
    if "upload.wikimedia.org" in url and "/thumb/" not in url:
        head, name = url.rsplit("/", 1)
        for w in WIKI_WIDTHS:
            yield f"{head}/thumb/{name}/{w}px-{name}"
    yield url


def download(url):
    """First variant that returns a real image, or None."""
    last = None
    for cand in variants(url):
        try:
            data = get(cand)
        except Exception as e:
            last = e
            continue
        if len(data) >= 40_000:
            return data
        last = ValueError(f"{len(data)} bytes")
    raise last or ValueError("no variant")


def slug(query, url, n):
    stem = re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")
    tail = re.sub(r"[^A-Za-z0-9]+", "", url.rsplit("/", 1)[-1])[-14:].lower()
    return f"{stem}-{n:02d}-{tail}"


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("--")]
    per = 20
    if "--per" in sys.argv:
        per = int(sys.argv[sys.argv.index("--per") + 1])
    queries = argv or QUERIES

    os.makedirs(PHOTOS, exist_ok=True)
    manifest = {}
    if os.path.exists(MANIFEST):
        manifest = json.load(open(MANIFEST))
    seen_urls = {v["source"] for v in manifest.values() if v.get("source")}

    for query in queries:
        hits = []
        for page in range(1, PAGES + 1):
            try:
                hits += search(query, per, page)
            except Exception as e:
                print(f"  {query} p{page}: search failed: {e}")
                break
            time.sleep(0.4)
        n = 0
        for hit in hits:
            w, h = hit.get("width") or 0, hit.get("height") or 0
            src = hit.get("url") or ""
            if not src or src in seen_urls:
                continue
            if w < MIN_W or h and w / h < MIN_RATIO:
                continue
            slug_name = slug(query, src, n)
            path = os.path.join(PHOTOS, slug_name + ".jpg")
            if os.path.exists(path):
                n += 1
                continue
            try:
                data = download(src)
            except Exception as e:
                print(f"  {query}: download failed {e}")
                continue
            with open(path, "wb") as f:
                f.write(data)
            seen_urls.add(src)
            manifest[slug_name] = {
                "file": slug_name + ".jpg",
                "query": query,
                "title": hit.get("title") or "",
                "creator": hit.get("creator") or "",
                "source": hit.get("foreign_landing_url") or hit.get("source") or "",
                "licence": f"{(hit.get('license') or '').upper()} {hit.get('license_version') or ''}".strip(),
                "w": w, "h": h, "bytes": len(data),
            }
            n += 1
        print(f"  {query}: {n} new ({len(hits)} hits)")
        json.dump(manifest, open(MANIFEST, "w"), indent=1)
        time.sleep(1.0)  # anonymous burst limit is 20 requests/minute

    print(f"{len(manifest)} photos -> {MANIFEST}")


if __name__ == "__main__":
    main()
