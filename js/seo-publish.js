/* Publication state comes from the deployed static catalog, not a saved DB row. */
(function (root) {
  'use strict';
  var fields = ['title', 'description', 'og_image', 'robots'];
  function expected(row, defaults) {
    var result = {};
    fields.forEach(function (key) { result[key] = (row[key] || '').trim() || defaults[key]; });
    return result;
  }
  function published(pages, path, target) {
    if (!Array.isArray(pages)) return false;
    var page = pages.find(function (p) { return p.path === path; });
    return !!(page && page.applied && fields.every(function (key) { return page.applied[key] === target[key]; }));
  }
  function watch(path, row, defaults, notify, options) {
    var opts = options || {}, stopped = false, timer, attempts = 0;
    var request = opts.fetch || root.fetch.bind(root);
    var schedule = opts.setTimeout || root.setTimeout.bind(root);
    var cancel = opts.clearTimeout || root.clearTimeout.bind(root);
    var target = expected(row, defaults);
    notify('pending');
    async function check() {
      if (stopped) return;
      attempts++;
      var ok = false;
      try {
        var res = await request('https://hotelagava.ge/data/seo-pages.json?publication=' + Date.now(), { cache: 'no-store', credentials: 'omit' });
        if (res.ok) ok = published(await res.json(), path, target);
      } catch (_) { /* A read/network failure never changes the saved settings. */ }
      if (stopped) return;
      if (ok) { notify('published'); return; }
      if (attempts >= (opts.maxAttempts || 90)) { notify('delayed'); return; }
      timer = schedule(check, opts.interval || 20000);
    }
    check();
    return function () { stopped = true; if (timer) cancel(timer); };
  }
  var api = { expected: expected, published: published, watch: watch };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AGAVA_SEO_PUBLISH = api;
})(typeof window === 'undefined' ? globalThis : window);
