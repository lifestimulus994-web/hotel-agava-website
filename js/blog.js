/* ═══════════════════════════════════════════
   HOTEL AGAVA — public blog (list + single post)
   Reads published posts from Supabase (anon, RLS: published only).
   List page has #blogGrid; post page has #blogArticle (+ ?slug=).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = window.AGAVA_CONFIG || {};
  var grid = document.getElementById("blogGrid");
  var article = document.getElementById("blogArticle");
  if (!grid && !article) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fmtDate(s) { return (s || "").slice(0, 10); }

  if (!CFG.CONFIGURED || !window.supabase) {
    var host = grid || article;
    if (host) host.innerHTML = '<p class="muted">ბლოგი დროებით მიუწვდომელია.</p>';
    return;
  }
  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

  /* ─── list ─── */
  if (grid) {
    grid.innerHTML = '<p class="muted">იტვირთება…</p>';
    sb.from("blog_posts")
      .select("slug,title,excerpt,cover_url,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(function (res) {
        var posts = (res && res.data) || [];
        if (!posts.length) { grid.innerHTML = '<p class="muted">მალე დაემატება სტატიები.</p>'; return; }
        grid.innerHTML = posts.map(function (p) {
          return '<a class="blog-card" href="/blog/read/?slug=' + encodeURIComponent(p.slug) + '">' +
            (p.cover_url ? '<div class="blog-card__img"><img src="' + esc(p.cover_url) + '" alt="' + esc(p.title) + '" loading="lazy"></div>' : '') +
            '<div class="blog-card__body"><time>' + fmtDate(p.created_at) + '</time>' +
            '<h2>' + esc(p.title) + '</h2>' +
            (p.excerpt ? '<p>' + esc(p.excerpt) + '</p>' : '') +
            '<span class="blog-card__more">ვრცლად →</span></div></a>';
        }).join("");
      });
  }

  /* ─── single post ─── */
  if (article) {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { article.innerHTML = '<p class="muted">პოსტი ვერ მოიძებნა.</p>'; return; }
    article.innerHTML = '<p class="muted">იტვირთება…</p>';
    sb.from("blog_posts").select("*").eq("slug", slug).eq("published", true).limit(1)
      .then(function (res) {
        var p = res && res.data && res.data[0];
        if (!p) { article.innerHTML = '<p class="muted">პოსტი ვერ მოიძებნა.</p>'; return; }
        var url = "https://hotelagava.ge/blog/read/?slug=" + encodeURIComponent(slug);
        document.title = p.title + " — სასტუმრო აგავა";
        setMeta('meta[name="description"]', "name", "description", p.excerpt || p.title);
        setLink('link[rel="canonical"]', "canonical", url);
        setMeta('meta[property="og:title"]', "property", "og:title", p.title);
        setMeta('meta[property="og:description"]', "property", "og:description", p.excerpt || p.title);
        setMeta('meta[property="og:type"]', "property", "og:type", "article");
        if (p.cover_url) setMeta('meta[property="og:image"]', "property", "og:image", p.cover_url);
        injectLD({
          "@context": "https://schema.org", "@type": "BlogPosting",
          headline: p.title, description: p.excerpt || "",
          image: p.cover_url || undefined,
          datePublished: p.created_at, dateModified: p.updated_at || p.created_at,
          author: { "@type": "Organization", name: "სასტუმრო აგავა" },
          publisher: { "@type": "Organization", name: "სასტუმრო აგავა", logo: { "@type": "ImageObject", url: "https://hotelagava.ge/assets/logo-full.png" } },
          mainEntityOfPage: url
        });
        article.innerHTML =
          '<nav class="rdp-crumb"><a href="/">მთავარი</a> · <a href="/blog/">ბლოგი</a> · <span>' + esc(p.title) + '</span></nav>' +
          '<h1 class="blog-article__title">' + esc(p.title) + '</h1>' +
          '<time class="blog-article__date">' + fmtDate(p.created_at) + '</time>' +
          (p.cover_url ? '<img class="blog-article__cover" src="' + esc(p.cover_url) + '" alt="' + esc(p.title) + '">' : '') +
          '<div class="blog-article__body">' + p.body_html + '</div>' +
          '<a class="rdp-back" href="/blog/">← ბლოგზე დაბრუნება</a>';
      });
  }

  function setMeta(sel, attrName, attrVal, content) {
    var el = document.querySelector(sel);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attrName, attrVal); document.head.appendChild(el); }
    el.setAttribute("content", content);
  }
  function setLink(sel, rel, href) {
    var el = document.querySelector(sel);
    if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
    el.setAttribute("href", href);
  }
  function injectLD(obj) {
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
})();
