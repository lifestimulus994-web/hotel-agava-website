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

  /* language prefix from URL path: "/en" | "/ru" | "/tr" | "" (ka) */
  var LB = (location.pathname.match(/^\/(en|ru|tr)(?=\/)/) || [""])[0];
  var LK = LB === "/en" ? "en" : LB === "/ru" ? "ru" : LB === "/tr" ? "tr" : "ka";
  var UI = {
    home:     { ka: "მთავარი", en: "Home", ru: "Главная", tr: "Ana Sayfa" },
    blog:     { ka: "ბლოგი", en: "Blog", ru: "Блог", tr: "Blog" },
    back:     { ka: "← ბლოგზე დაბრუნება", en: "← Back to blog", ru: "← Назад к блогу", tr: "← Bloga dön" },
    loading:  { ka: "იტვირთება…", en: "Loading…", ru: "Загрузка…", tr: "Yükleniyor…" },
    soon:     { ka: "მალე დაემატება სტატიები.", en: "Articles coming soon.", ru: "Скоро появятся статьи.", tr: "Yakında makaleler eklenecek." },
    notfound: { ka: "პოსტი ვერ მოიძებნა.", en: "Post not found.", ru: "Пост не найден.", tr: "Yazı bulunamadı." },
    more:     { ka: "ვრცლად →", en: "Read more →", ru: "Подробнее →", tr: "Devamı →" },
    unavail:  { ka: "ბლოგი დროებით მიუწვდომელია.", en: "Blog temporarily unavailable.", ru: "Блог временно недоступен.", tr: "Blog geçici olarak kullanılamıyor." }
  };
  function t(k) { return UI[k][LK]; }

  if (!CFG.CONFIGURED || !window.supabase) {
    var host = grid || article;
    if (host) host.innerHTML = '<p class="muted">' + t("unavail") + '</p>';
    return;
  }
  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

  /* ─── list ─── */
  if (grid) {
    grid.innerHTML = '<p class="muted">' + t("loading") + '</p>';
    sb.from("blog_posts")
      .select("slug,title,excerpt,cover_url,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(function (res) {
        var posts = (res && res.data) || [];
        if (!posts.length) { grid.innerHTML = '<p class="muted">' + t("soon") + '</p>'; return; }
        grid.innerHTML = posts.map(function (p) {
          return '<a class="blog-card" href="/blog/' + encodeURIComponent(p.slug) + '/">' +
            (p.cover_url ? '<div class="blog-card__img"><img src="' + esc(p.cover_url) + '" alt="' + esc(p.title) + '" loading="lazy"></div>' : '') +
            '<div class="blog-card__body"><time>' + fmtDate(p.created_at) + '</time>' +
            '<h2>' + esc(p.title) + '</h2>' +
            (p.excerpt ? '<p>' + esc(p.excerpt) + '</p>' : '') +
            '<span class="blog-card__more">' + t("more") + '</span></div></a>';
        }).join("");
      });
  }

  /* ─── single post ─── */
  if (article) {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { article.innerHTML = '<p class="muted">' + t("notfound") + '</p>'; return; }
    article.innerHTML = '<p class="muted">' + t("loading") + '</p>';
    sb.from("blog_posts").select("*").eq("slug", slug).eq("published", true).limit(1)
      .then(function (res) {
        var p = res && res.data && res.data[0];
        if (!p) { article.innerHTML = '<p class="muted">' + t("notfound") + '</p>'; return; }
        /* the static page built by scripts/build_blog.py is the real one */
        var url = "https://hotelagava.ge/blog/" + encodeURIComponent(slug) + "/";
        document.title = p.title + " — სასტუმრო აგავა";
        setMeta('meta[name="description"]', "name", "description", p.excerpt || p.title);
        setLink('link[rel="canonical"]', "canonical", url);
        /* the template ships noindex so the empty shell never gets indexed;
           a real post overrides it */
        setMeta('meta[name="robots"]', "name", "robots", "index, follow");
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
          '<nav class="rdp-crumb"><a href="' + (LB || "/") + '">' + t("home") + '</a> · <a href="' + LB + '/blog/">' + t("blog") + '</a> · <span>' + esc(p.title) + '</span></nav>' +
          '<h1 class="blog-article__title">' + esc(p.title) + '</h1>' +
          '<time class="blog-article__date">' + fmtDate(p.created_at) + '</time>' +
          (p.cover_url ? '<img class="blog-article__cover" src="' + esc(p.cover_url) + '" alt="' + esc(p.title) + '">' : '') +
          '<div class="blog-article__body">' + p.body_html + '</div>' +
          '<a class="rdp-back" href="' + LB + '/blog/">' + t("back") + '</a>';
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
