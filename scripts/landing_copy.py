# -*- coding: utf-8 -*-
"""Replace a landing page's prose with author-written copy, keeping her words.

Same contract as room_copy.py — hyphen repairs, confirmed factual fixes
only, headings at topic changes, links on existing phrases, a paragraph-by-
paragraph check against the source — with two differences that come from
landings already having content.

The old prose is replaced, not appended: stacking the new copy on top would
leave pages near 1,500 words saying most things twice. The features grid,
FAQ and the contact block stay. And because the old prose carried specific
figures the new copy states more loosely — 11 parking spaces, the 70/50
transfer, cash only, no luggage room — any such fact that would otherwise
disappear from the page is moved into the FAQ, visible and in the schema.

The homepage is different again: its prose is added as its own section
before the FAQ, leaving the hero, room grid and reviews untouched.

    python3 scripts/landing_copy.py <copy.json> <key> [<key> ...]   # key "home" = /
"""
import io, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from room_copy import typo, esc_ld

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "landing-article"

TOPICS = [  # checked in order; first match names the heading
    ("jacuzzi",   r"Jacuzzi|ჯაკუზ",                 "ნომრები პირადი ჯაკუზით"),
    ("family",    r"ოჯახურ ნომ|ორ ოთახიან",          "ოჯახური ნომრები 3–5 სტუმრისთვის"),
    ("rooms2",    r"სტანდარტულ|Lux|Superlux",        "ნომრები ორი სტუმრისთვის"),
    ("wifi",      r"Wi-Fi|ინტერნეტ",                 "უფასო Wi-Fi"),
    ("parking",   r"პარკინგ",                        "უფასო პარკინგი"),
    ("lift",      r"ლიფტ",                           "სასტუმრო ლიფტით — ოთხივე სართულზე"),
    ("reception", r"რეცეფცი|24-საათიან",             "24-საათიანი რეცეფცია"),
    ("breakfast", r"საუზმ",                          "საუზმე"),
    ("laundry",   r"სამრეცხაო",                      "სამრეცხაო"),
    ("transfer",  r"ტრანსფერ",                       "აეროპორტის ტრანსფერი"),
    ("booking",   r"წინასწარ.{0,25}დაჯავშნ|დაჯავშნ.{0,25}წინასწარ|პირდაპირ.{0,20}დაჯავშნ", "დაჯავშნა"),
    ("location",  r"დიღომ",                          "მდებარეობა — დიღომი"),
]
# the page's own subject is not a sub-topic of itself
SELF = {"jacuzzi-rooms-tbilisi": {"jacuzzi"}, "family-hotel-tbilisi": {"family"}}

LINKS = [
    ("ჯაკუზიანი ნომრების გვერდზე", "/jacuzzi-rooms-tbilisi/"),
    ("ოჯახური სასტუმროს გვერდზე",  "/family-hotel-tbilisi/"),
    ("Family Hotel Tbilisi გვერდზე", "/family-hotel-tbilisi/"),
    ("Business Hotel Tbilisi გვერდზე", "/business-hotel-tbilisi/"),
    ("საქმიანი სტუმრებისთვის განკუთვნილ გვერდზე", "/business-hotel-tbilisi/"),
    ("სერვისების გვერდზე",         "/amenities/"),
    ("Amenities გვერდზე",          "/amenities/"),
    ("შეთავაზებების გვერდზე",      "/offers/"),
    ("სტანდარტული ნომერ",          "/rooms/standard/"),
    ("Lux ნომერ",                  "/rooms/lux/"),
    ("Superlux",                   "/rooms/superlux/"),
    ("ოჯახური ნომერი 3 სტუმარზე",  "/rooms/family3/"),
    ("ოჯახური ნომერი 4 სტუმარზე",  "/rooms/family4/"),
    ("ორ ოთახიანი ლუქს",           "/rooms/twobedlux/"),
    ("Jacuzzi Suite",              "/rooms/jacuzzi-suite/"),
    ("Jacuzzi ნომერ",              "/rooms/jacuzzi/"),
    ("უფასო Wi-Fi",                "/services/wifi/"),
    ("უფასო პარკინგ",              "/services/parking/"),
    ("საკუთარ პარკინგ",            "/services/parking/"),
    ("24-საათიანი რეცეფცია",       "/services/reception/"),
    ("24-საათიან რეცეფციას",       "/services/reception/"),
    ("საუზმის დამატება",           "/services/breakfast/"),
    ("სამრეცხაოს მომსახურება",     "/services/laundry/"),
    ("აეროპორტის ტრანსფერ",        "/services/transfer/"),
    ("დიღომში",                    "/hotel-dighomi-tbilisi/"),
]

# figures the old prose stated precisely; if the new copy and the existing
# FAQ both lack one, it becomes an FAQ entry rather than vanishing
FACTS = [
    (r"11 ადგილ", "პარკინგი უფასოა და რამდენი ადგილია?",
     "დიახ, სასტუმროს სტუმრებისთვის უფასოა. ეზოში 11 ადგილია, ამიტომ მანქანით ჩამოსვლისას წინასწარ გვაცნობეთ."),
    (r"70 ₾", "რა ღირს ტრანსფერი აეროპორტიდან?",
     "აეროპორტიდან სასტუმრომდე 70 ₾, სასტუმროდან აეროპორტამდე 50 ₾. ფასი მანქანაზეა, ოთხი ადგილით; გზა 30–40 წუთი."),
    (r"ნაღდ", "ბარათით გადახდა შემიძლია?",
     "არა, ანგარიშსწორება ადგილზე ხდება, მხოლოდ ნაღდი ფულით."),
    (r"ბარგის შესანახ", "შემიძლია ჩანთა დავტოვო გასვლის შემდეგ?",
     "სამწუხაროდ არა — ბარგის შესანახი ოთახი სასტუმროს არ აქვს. თუ იმ დღეს ქალაქში რჩებით, ჯობს გვიანი გასვლა შეათანხმოთ."),
    (r"30 ₾", "რა ღირს საუზმე?",
     "30 ₾ ერთ სტუმარზე, შვედური მაგიდა 08:00-დან 11:00-მდე. ნომრის ფასში არ შედის."),
    (r"13:00", "რომელ საათზეა ჩასვლა და გასვლა?",
     "ჩასვლა 13:00-დან, გასვლა 12:00-მდე. ადრეული ჩასვლა და გვიანი გასვლა ფასიანია."),
    (r"10 ₾", "რა ღირს სამრეცხაო?",
     "10 ₾ ერთ ნივთზე, მზადაა 12 საათში."),
    (r"400 ₾|300 ₾", "რა ღირს ჯაკუზიანი ნომერი?",
     "სუპერ ლუქსი ჯაკუზით — 400 ₾, King ზომის საწოლით. ლუქსი ჯაკუზით — 300 ₾, 30 მ² და ქალაქის ხედით."),
    (r"საკონფერენციო|ბიზნეს ცენტრ", "არის თუ არა საკონფერენციო დარბაზი?",
     "არა. სასტუმროში საკონფერენციო დარბაზი და ბიზნეს ცენტრი არ არის."),
    (r"რესტორან|აუზ", "არის თუ არა სასტუმროში რესტორანი ან აუზი?",
     "არა. სასტუმროში არ არის რესტორანი სრული მენიუთი, საცურაო აუზი, სპა ან სავარჯიშო დარბაზი."),
]


def plain(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))


def sections(subtitle, paras, key):
    skip = SELF.get(key, set())
    out, cur, cur_h, used = [], [], subtitle, {subtitle}
    for i, p in enumerate(paras):
        hits = [(t, label) for t, pat, label in TOPICS if t not in skip and re.search(pat, p)]
        last = i == len(paras) - 1
        if i and hits and len({t for t, _ in hits}) < 3 and not last:
            label = hits[0][1]
            if label not in used:
                out.append((cur_h, cur)); cur, cur_h = [], label
                used.add(label)
        cur.append(p)
    out.append((cur_h, cur))
    return out


def link(p, self_path, used):
    for phrase, href in LINKS:
        if href == self_path or href in used:
            continue
        m = re.search(r"(?<![\w>])" + re.escape(phrase), p)
        if m and p.rfind("<a ", 0, m.start()) <= p.rfind("</a>", 0, m.start()):
            p = p[:m.start()] + f'<a href="{href}">{phrase}</a>' + p[m.end():]
            used.add(href)
    return p


def body_html(key, spec, self_path):
    paras = [typo(p) for p in spec["paras"]]
    for old, new in spec.get("fixes", []):
        if not any(old in p for p in paras):
            raise SystemExit(f"  ❌ {key}: შესწორება ვერ მოიძებნა — {old[:70]}")
        paras = [p.replace(old, new) for p in paras]
    subtitle = spec.get("subtitle_fixed") or typo(spec["subtitle"])
    used, html = set(), ""
    for h, ps in sections(subtitle, paras, key):
        html += f'      <h2 class="section-title">{h}</h2>\n'
        html += "".join(f'      <p class="rdp-desc">{link(p, self_path, used)}</p>\n' for p in ps) + "\n"
    return html, paras


def faq_items(pairs):
    return "".join(f"""          <details class="faq__item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
""" for q, a in pairs)


def do_landing(key, spec):
    f = os.path.join(ROOT, key, "index.html")
    h = io.open(f, encoding="utf-8").read()
    if MARK in h:
        return print(f"  ↺ /{key}/ უკვე ჩასმულია — გამოტოვდა")

    # the prose sits between the features grid and the FAQ section
    start = h.index('</section>', h.index('<section class="features">')) + len('</section>')
    faq_at = h.index('<section class="faq">', start)
    div_open = h.index('<div class="container container--narrow">', start)
    div_close = h.rindex('</div>', div_open, faq_at)
    old = h[div_open + len('<div class="container container--narrow">'):div_close]

    contact = ""
    m = re.search(r'\s*<h2 class="section-title">კონტაქტი და მისამართი</h2>\s*<p class="rdp-desc">.*?</p>', old, re.S)
    if m:
        contact = "\n" + m.group(0).strip("\n") + "\n"

    new, paras = body_html(key, spec, f"/{key}/")

    faq_sec = h[faq_at:h.index("</section>", faq_at)]
    faq_text = plain(faq_sec)
    new_text = " ".join(paras)
    old_text = plain(old)
    added = []
    for pat, q, a in FACTS:
        if re.search(pat, old_text) and not re.search(pat, new_text) and not re.search(pat, faq_text):
            added.append((q, a))

    block = (f'\n      <!-- {MARK} -->\n' + new + contact + "    ")
    h = h[:div_open + len('<div class="container container--narrow">')] + block + h[div_close:]

    if added:
        list_end = h.index("</div>", h.index('<div class="faq__list">'))
        h = h[:list_end] + faq_items(added) + "        " + h[list_end:]
        ldm = re.search(r'<script type="application/ld\+json">(\{"@context":"https://schema.org","@type":"FAQPage".*?)</script>', h, re.S)
        if ldm:
            d = json.loads(ldm.group(1).replace("\\u003c", "<").replace("\\u003e", ">").replace("\\u0026", "&"))
            d["mainEntity"] += [{"@type": "Question", "name": q,
                                 "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in added]
            h = h[:ldm.start(1)] + esc_ld(json.dumps(d, ensure_ascii=False, separators=(",", ":"))) + h[ldm.end(1):]

    io.open(f, "w", encoding="utf-8").write(h)
    report(f"/{key}/", h, paras, added)


def do_home(spec):
    f = os.path.join(ROOT, "index.html")
    h = io.open(f, encoding="utf-8").read()
    if MARK in h:
        return print("  ↺ / უკვე ჩასმულია — გამოტოვდა")
    new, paras = body_html("home", spec, "/")
    sec = (f'<section class="{MARK}" data-noi18n>\n'
           f'    <div class="container container--narrow" style="padding-block:72px">\n'
           + new + '    </div>\n  </section>\n\n  ')
    at = h.index('<section class="faq"')
    h = h[:at] + sec + h[at:]
    io.open(f, "w", encoding="utf-8").write(h)
    report("/", h, paras, [])


def report(path, h, paras, added):
    art = h[h.index(MARK):]
    art = art[:art.index('<section class="faq"')] if '<section class="faq"' in art else art
    live = [re.sub(r"<[^>]+>", "", p) for p in re.findall(r'<p class="rdp-desc">(.*?)</p>', art, re.S)]
    ok = live[:len(paras)] == paras
    body = re.sub(r'(?is)<(script|style|header|footer|nav)\b.*?</\1>', " ", h[h.index("<body>"):])
    words = len([w for w in plain(body).split() if len(w) > 1])
    h2s = re.findall(r'<h2 class="section-title">(.*?)</h2>', art)
    print(f"  {'✅' if ok else '❌ ტექსტი არ ემთხვევა'} {path}  {words} სიტყვა · h2 {len(h2s)} · FAQ-ში გადავიდა {len(added)}")
    for x in h2s:
        print(f"        · {x}")
    for q, _ in added:
        print(f"        + FAQ: {q}")


def main():
    data = json.load(io.open(sys.argv[1], encoding="utf-8"))
    for key in sys.argv[2:]:
        do_home(data[key]) if key == "home" else do_landing(key, data[key])


if __name__ == "__main__":
    main()
