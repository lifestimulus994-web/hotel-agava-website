# -*- coding: utf-8 -*-
"""Insert author-written copy into a room page, keeping her words intact.

Marietta writes the long-form copy for each room page. This script puts it
on the page without rewriting it: it fixes the hyphens her editor strips
(Wi Fi, Agava ში, 24 საათიანი), applies an explicit list of factual
corrections she has confirmed, groups paragraphs under h2 headings at topic
changes, links existing phrases to related pages, and adds an FAQ with
FAQPage schema. After inserting, it checks the page text against the source
so a changed word cannot slip through unnoticed.

    python3 scripts/room_copy.py <copy.json> <slug> [<slug> ...]

copy.json maps slug -> {"subtitle": str, "paras": [str], "fixes": [[old, new]],
"faq": [[q, a]]}.
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "room-article"

TYPO = [
    (r"Wi Fi", "Wi-Fi"),
    (r"24 საათიან", "24-საათიან"),
    (r"ერთერთ", "ერთ-ერთ"),
    (r"ცალცალკე", "ცალ-ცალკე"),
    (r"შაბათ კვირ", "შაბათ-კვირ"),
    (r"ოროთახიან", "ორ ოთახიან"),
    # a Latin name followed by a detached Georgian case ending
    (r"([A-Za-z]) (ის|ში|ს|სთან|ზე|დან|ით)(?=[\s.,;:!?])", r"\1-\2"),
]

# topic of a paragraph, checked in order; a paragraph that touches three or
# more topics is a summary and stays with the section before it
# "other rooms" must never match the page's own room, or every paragraph on
# the lux page counts as being about other rooms
OTHER_ROOMS = {
    "standard":      r"Superlux|Lux ნომ|ჯაკუზიან ნომ",
    "lux":           r"Superlux|სტანდარტულ|ჯაკუზიან ნომ",
    "superlux":      r"Lux ნომ|სტანდარტულ|Jacuzzi|ჯაკუზიან ნომ",
    "family3":       r"4 სტუმარზე|ორ ოთახიან",
    "family4":       r"3 სტუმარზე|ორ ოთახიან",
    "twobedlux":     r"4 სტუმარზე|3 სტუმარზე",
    "jacuzzi-suite": r"Superlux|Lux ნომ|Jacuzzi ნომერი",
    "jacuzzi":       r"Superlux|Lux ნომ|Jacuzzi Suite",
}

def topics_for(slug):
    return [
        ("parking",   r"პარკინგ"),
        ("reception", r"რეცეფცი|24-საათიან"),
        ("amenities", r"კონდიციონერ|სააბაზანო|მაცივარ"),
        ("area",      r"მ² (ფართობ|სივრც)"),
        ("rooms",     OTHER_ROOMS.get(slug, r"(?!)")),
        ("booking",   r"წინასწარ.{0,20}დაჯავშნ|დაჯავშნ.{0,20}წინასწარ"),
        ("location",  r"დიღომ"),
    ]
H2 = {
    "amenities": "რა დაგხვდებათ ნომერში",
    "area":      "ფართობი და სივრცე",
    "parking":   "პარკინგი და 24-საათიანი რეცეფცია",
    "reception": "პარკინგი და 24-საათიანი რეცეფცია",
    "rooms":     "სხვა ნომრები Hotel Agava-ში",
    "booking":   "წინასწარი დაჯავშნა",
    "location":  "მდებარეობა — დიღომი",
}

LINKS = [
    ("სტანდარტული ნომერი", "/rooms/standard/"),
    ("Lux ნომერ",          "/rooms/lux/"),
    ("Superlux",           "/rooms/superlux/"),
    ("ოჯახური ნომერი 4 სტუმარზე", "/rooms/family4/"),
    ("ოჯახურ ნომერს 3 სტუმარზე",  "/rooms/family3/"),
    ("ორ ოთახიან ლუქს",     "/rooms/twobedlux/"),
    ("ჯაკუზიანი ნომერი",    "/jacuzzi-rooms-tbilisi/"),
    ("უფასო პარკინგ",       "/services/parking/"),
    ("საკუთარი პარკინგ",    "/services/parking/"),
    ("24-საათიანი რეცეფცია", "/services/reception/"),
    ("დიღომში",             "/hotel-dighomi-tbilisi/"),
]


def typo(s):
    for pat, rep in TYPO:
        s = re.sub(pat, rep, s)
    return s


def topic(p, slug):
    hits = [t for t, pat in topics_for(slug) if re.search(pat, p)]
    if len(set(hits)) >= 3:
        return "summary"
    return hits[0] if hits else None


def sections(subtitle, paras, slug):
    out, cur, cur_h, used = [], [], subtitle, {subtitle}
    for i, p in enumerate(paras):
        t = topic(p, slug)
        label = H2.get(t)
        last = i == len(paras) - 1
        if i and label and label not in used and not last and t != "summary":
            out.append((cur_h, cur)); cur, cur_h = [], label
            used.add(label)
        cur.append(p)
    out.append((cur_h, cur))
    return out


def link_all(html, self_path, used):
    for phrase, href in LINKS:
        if href == self_path or href in used:
            continue
        m = re.search(r"(?<![\w>])" + re.escape(phrase), html)
        # never link inside an existing anchor
        if m and html.rfind("<a ", 0, m.start()) <= html.rfind("</a>", 0, m.start()):
            html = html[:m.start()] + f'<a href="{href}">{phrase}</a>' + html[m.end():]
            used.add(href)
    return html


def esc_ld(s):
    return s.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def build(slug, spec):
    paras = [typo(p) for p in spec["paras"]]
    for old, new in spec.get("fixes", []):
        hits = sum(p.count(old) for p in paras)
        if not hits:
            raise SystemExit(f"  ❌ {slug}: შესწორება ვერ მოიძებნა — {old[:60]}")
        paras = [p.replace(old, new) for p in paras]
    subtitle = spec.get("subtitle_fixed") or typo(spec["subtitle"])

    body, used = "", set()
    for h, ps in sections(subtitle, paras, slug):
        body += f'    <h2 class="section-title">{h}</h2>\n'
        body += "".join(f'    <p class="rdp-desc">{link_all(p, f"/rooms/{slug}/", used)}</p>\n' for p in ps) + "\n"

    faq = spec.get("faq", [])
    faq_html = "".join(f"""        <details class="faq__item">
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
""" for q, a in faq)
    block = (f'\n  <article class="container container--narrow {MARK}" style="margin-top:56px">\n'
             + body + "  </article>\n")
    if faq:
        block += f"""
  <section class="faq">
    <div class="container">
      <div class="faq__head">
        <p class="section-eyebrow">ხშირად დასმული კითხვები</p>
        <h2 class="section-title">ხშირად დასმული კითხვები</h2>
      </div>
      <div class="faq__list">
{faq_html}      </div>
    </div>
  </section>
"""
    ld = None
    if faq:
        ld = ('  <script type="application/ld+json">' + esc_ld(json.dumps(
            {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                for q, a in faq]}, ensure_ascii=False, separators=(",", ":"))) + "</script>\n")
    return block, ld, paras


def main():
    src, slugs = sys.argv[1], sys.argv[2:]
    data = json.load(io.open(src, encoding="utf-8"))
    for slug in slugs:
        spec = data[slug]
        f = os.path.join(ROOT, "rooms", slug, "index.html")
        h = io.open(f, encoding="utf-8").read()
        if MARK in h:
            print(f"  ↺ /rooms/{slug}/ უკვე ჩასმულია — გამოტოვდა"); continue
        block, ld, paras = build(slug, spec)
        h = h.replace("</main>", block + "</main>", 1)
        if ld:
            h = h.replace("</head>", ld + "</head>", 1)
        io.open(f, "w", encoding="utf-8").write(h)

        # fidelity: the paragraphs on the page, tags removed, must equal
        # the source after only the typography and confirmed fixes
        art = re.search(r'<article class="[^"]*room-article.*?</article>', h, re.S).group(0)
        live = [re.sub(r"<[^>]+>", "", p) for p in re.findall(r'<p class="rdp-desc">(.*?)</p>', art, re.S)]
        ok = live == paras
        body = re.sub(r'(?is)<(script|style|header|footer|nav)\b.*?</\1>', " ", h[h.index("<body>"):])
        words = len([w for w in re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)).split() if len(w) > 1])
        h2s = re.findall(r'<h2 class="section-title">(.*?)</h2>', art)
        print(f"  {'✅' if ok else '❌ ტექსტი არ ემთხვევა'} /rooms/{slug}/  {words} სიტყვა · "
              f"h2 {len(h2s)} · FAQ {len(spec.get('faq', []))} · ფიქს {len(spec.get('fixes', []))}")
        for x in h2s:
            print(f"        · {x}")


if __name__ == "__main__":
    main()
