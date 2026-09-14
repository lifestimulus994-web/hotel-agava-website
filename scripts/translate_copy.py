# -*- coding: utf-8 -*-
"""Put a translation of the author's Georgian copy onto /ru/, /en/ or /tr/.

The Georgian pages are the source: room_copy.py and landing_copy.py already
placed Marietta's text there with its headings, links and FAQ. A translated
page must say the same thing in the same shape, so this script reads the
live Georgian page and refuses to publish a translation that differs from it
in structure — a missing paragraph, a dropped link, a changed price.

The translation is a plain text file, one page per block:

    === rooms/lux                  (or "home", or a landing slug)
    ## Heading
    One paragraph per line, links as [text](/ru/rooms/lux/).
    ?? FAQ question
    !! FAQ answer

For room pages the FAQ is the whole FAQ. For landings and the homepage it is
only the entries the Georgian FAQ gained when its prose was replaced; the
entries both languages already had stay as they are.

    python3 scripts/translate_copy.py <copy.txt> <lang> [<key> ...]
"""
import io, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from room_copy import esc_ld

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KA_CONTACT = "კონტაქტი და მისამართი"
CONTACT = {"ru": "Контакты и адрес", "en": "Contact and address", "tr": "İletişim ve adres"}
FAQ_TITLE = {"ru": "Часто задаваемые вопросы", "en": "Frequently asked questions",
             "tr": "Sıkça sorulan sorular"}
# a figure the Georgian writes as digits may be a word in translation
NUM_WORDS = {"ru": {"24": r"[Кк]руглосуточн"}, "en": {"24": r"round-the-clock"},
             "tr": {"24": r"24 saat"}}
# notation that carries a digit the Georgian doesn't write: "24/7" is still just 24
NUM_NOTATION = {"en": [(r"24/7", "24")], "tr": [(r"7/24", "24")]}


def parse(path):
    pages, cur = {}, None
    for raw in io.open(path, encoding="utf-8"):
        line = raw.strip()
        if not line:
            continue
        if line.startswith("=== "):
            cur = pages.setdefault(line[4:].strip(), {"sections": [], "faq": []})
        elif line.startswith("## "):
            cur["sections"].append([line[3:].strip(), []])
        elif line.startswith("?? "):
            cur["faq"].append([line[3:].strip(), None])
        elif line.startswith("!! "):
            cur["faq"][-1][1] = line[3:].strip()
        else:
            cur["sections"][-1][1].append(
                re.sub(r"\[([^\]]+)\]\((/[^)\s]*)\)", r'<a href="\2">\1</a>', line))
    return pages


def text(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html)).strip()


def ka_sections(art):
    out = []
    for m in re.finditer(r'<h2 class="section-title">(.*?)</h2>(.*?)(?=<h2 class="section-title">|$)', art, re.S):
        if m.group(1) != KA_CONTACT:
            out.append([m.group(1), re.findall(r'<p class="rdp-desc">(.*?)</p>', m.group(2), re.S)])
    return out


def faq_pairs(h):
    at = h.find('<section class="faq"')
    if at < 0:
        return []
    sec = h[at:h.index("</section>", at)]
    return [(text(q), text(a)) for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p>(.*?)</p>", sec, re.S)]


def compare(key, lang, ka_secs, ka_faq, tr):
    """Return a list of differences that would change what the page says."""
    errs = []
    alias = NUM_WORDS.get(lang, {})

    def nums(src, dst, where):
        dst_t = text(dst)
        for pat, rep in NUM_NOTATION.get(lang, []):
            dst_t = re.sub(pat, rep, dst_t)
        a, b = set(re.findall(r"\d+", text(src))), set(re.findall(r"\d+", dst_t))
        missing = {n for n in a - b if not (n in alias and re.search(alias[n], dst))}
        extra = {n for n in b - a if n not in alias}
        if missing or extra:
            errs.append(f"{where}: ციფრები არ ემთხვევა — აკლია {sorted(missing)}, ზედმეტი {sorted(extra)}")

    if len(ka_secs) != len(tr["sections"]):
        errs.append(f"სექციები: ka {len(ka_secs)}, {lang} {len(tr['sections'])}")
    for i, ((kh, kps), (th, tps)) in enumerate(zip(ka_secs, tr["sections"]), 1):
        if len(kps) != len(tps):
            errs.append(f"სექცია {i} «{th}»: აბზაცები ka {len(kps)}, {lang} {len(tps)}")
            continue
        for j, (kp, tp) in enumerate(zip(kps, tps), 1):
            want = [f"/{lang}{u}" for u in re.findall(r'href="([^"]+)"', kp)]
            got = re.findall(r'href="([^"]+)"', tp)
            if want != got:
                errs.append(f"სექცია {i} ¶{j}: ლინკები ka {want}, {lang} {got}")
            nums(kp, tp, f"სექცია {i} ¶{j}")
    if len(ka_faq) != len(tr["faq"]):
        errs.append(f"FAQ: ka {len(ka_faq)}, {lang} {len(tr['faq'])}")
    for i, ((kq, ka), (tq, ta)) in enumerate(zip(ka_faq, tr["faq"]), 1):
        if not ta:
            errs.append(f"FAQ {i}: პასუხი აკლია")
        else:
            nums(kq + " " + ka, tq + " " + ta, f"FAQ {i}")
    return errs


def body(sections, indent):
    out = ""
    for h, ps in sections:
        out += f'{indent}<h2 class="section-title">{h}</h2>\n'
        out += "".join(f'{indent}<p class="rdp-desc">{p}</p>\n' for p in ps) + "\n"
    return out


def faq_items(pairs, indent):
    return "".join(f"""{indent}<details class="faq__item">
{indent}  <summary>{q}</summary>
{indent}  <p>{a}</p>
{indent}</details>
""" for q, a in pairs)


def faq_ld(pairs):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
        for q, a in pairs]}


def extend_faq(h, pairs):
    """Append entries to an existing FAQ list and to its FAQPage schema."""
    list_end = h.index("</div>", h.index('<div class="faq__list">'))
    h = h[:list_end] + faq_items(pairs, "          ") + "        " + h[list_end:]
    m = re.search(r'<script type="application/ld\+json">(\{"@context":"https://schema.org","@type":"FAQPage".*?)</script>', h, re.S)
    if not m:
        raise SystemExit("  ❌ FAQPage schema ვერ მოიძებნა")
    d = json.loads(m.group(1).replace("\\u003c", "<").replace("\\u003e", ">").replace("\\u0026", "&"))
    d["mainEntity"] += faq_ld(pairs)["mainEntity"]
    return h[:m.start(1)] + esc_ld(json.dumps(d, ensure_ascii=False, separators=(",", ":"))) + h[m.end(1):]


def do_room(key, lang, tr):
    ka = io.open(os.path.join(ROOT, key, "index.html"), encoding="utf-8").read()
    f = os.path.join(ROOT, lang, key, "index.html")
    h = io.open(f, encoding="utf-8").read()
    if "room-article" in h:
        return None, f"↺ /{lang}/{key}/ უკვე ჩასმულია — გამოტოვდა"
    art = re.search(r'<article class="[^"]*room-article.*?</article>', ka, re.S).group(0)
    errs = compare(key, lang, ka_sections(art), faq_pairs(ka), tr)
    if errs:
        return errs, None
    block = (f'\n  <article class="container container--narrow room-article" style="margin-top:56px">\n'
             + body(tr["sections"], "    ") + "  </article>\n")
    block += f"""
  <section class="faq">
    <div class="container">
      <div class="faq__head">
        <p class="section-eyebrow">{FAQ_TITLE[lang]}</p>
        <h2 class="section-title">{FAQ_TITLE[lang]}</h2>
      </div>
      <div class="faq__list">
{faq_items(tr["faq"], "        ")}      </div>
    </div>
  </section>
"""
    h = h.replace("</main>", block + "</main>", 1)
    ld = esc_ld(json.dumps(faq_ld(tr["faq"]), ensure_ascii=False, separators=(",", ":")))
    h = h.replace("</head>", f'  <script type="application/ld+json">{ld}</script>\n</head>', 1)
    io.open(f, "w", encoding="utf-8").write(h)
    return None, h


def do_landing(key, lang, tr):
    ka_path = "index.html" if key == "home" else os.path.join(key, "index.html")
    ka = io.open(os.path.join(ROOT, ka_path), encoding="utf-8").read()
    f = os.path.join(ROOT, lang, ka_path)
    h = io.open(f, encoding="utf-8").read()
    if "landing-article" in h:
        return None, f"↺ /{lang}/{'' if key == 'home' else key + '/'} უკვე ჩასმულია — გამოტოვდა"

    at = ka.index("landing-article")
    ka_secs = ka_sections(ka[at:ka.index('<section class="faq"', at)])
    ka_faq, own_faq = faq_pairs(ka), faq_pairs(h)
    added = ka_faq[len(own_faq):]
    errs = compare(key, lang, ka_secs, added, tr)
    if errs:
        return errs, None

    if key == "home":
        sec = ('<section class="landing-article" data-noi18n>\n'
               '    <div class="container container--narrow" style="padding-block:72px">\n'
               + body(tr["sections"], "      ") + "    </div>\n  </section>\n\n  ")
        faq_at = h.index('<section class="faq"')
        h = h[:faq_at] + sec + h[faq_at:]
    else:
        start = h.index("</section>", h.index('<section class="features">')) + len("</section>")
        faq_at = h.index('<section class="faq">', start)
        opener = '<div class="container container--narrow">'
        div_open = h.index(opener, start)
        div_close = h.rindex("</div>", div_open, faq_at)
        old = h[div_open + len(opener):div_close]
        contact = ""
        m = re.search(r'\s*<h2 class="section-title">' + re.escape(CONTACT[lang])
                      + r'</h2>\s*<p class="rdp-desc">.*?</p>', old, re.S)
        if m:
            contact = "\n" + m.group(0).strip("\n") + "\n"
        elif KA_CONTACT in ka:
            return [f"კონტაქტის ბლოკი «{CONTACT[lang]}» ვერ მოიძებნა"], None
        block = "\n      <!-- landing-article -->\n" + body(tr["sections"], "      ") + contact + "    "
        h = h[:div_open + len(opener)] + block + h[div_close:]
    if tr["faq"]:
        h = extend_faq(h, tr["faq"])
    io.open(f, "w", encoding="utf-8").write(h)
    return None, h


def report(path, lang, h, tr, ka_words):
    live = re.sub(r'(?is)<(script|style|header|footer|nav)\b.*?</\1>', " ", h[h.index("<body>"):])
    words = len([w for w in text(re.sub(r"<", " <", live)).split() if len(w) > 1])
    copy = sum(len(text(p).split()) for _, ps in tr["sections"] for p in ps)
    print(f"  ✅ {path}  {words} სიტყვა გვერდზე · ტექსტი {copy} (ka {ka_words}) · "
          f"h2 {len(tr['sections'])} · FAQ +{len(tr['faq'])}")


def main():
    src, lang, keys = sys.argv[1], sys.argv[2], sys.argv[3:]
    pages = parse(src)
    failed = False
    for key in keys or list(pages):
        tr = pages[key]
        is_room = key.startswith("rooms/")
        errs, h = (do_room if is_room else do_landing)(key, lang, tr)
        path = f"/{lang}/" + ("" if key == "home" else key + "/")
        if errs:
            failed = True
            print(f"  ❌ {path} — არ ჩაისვა:")
            for e in errs:
                print(f"        · {e}")
            continue
        if h.startswith("↺"):
            print("  " + h)
            continue
        ka = io.open(os.path.join(ROOT, "index.html" if key == "home" else os.path.join(key, "index.html")),
                     encoding="utf-8").read()
        mark = "room-article" if is_room else "landing-article"
        seg = ka[ka.index(mark):]
        seg = seg[:seg.index('<section class="faq"')] if '<section class="faq"' in seg else seg
        ka_words = sum(len(text(p).split()) for _, ps in ka_sections(seg) for p in ps)
        report(path, lang, h, tr, ka_words)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
