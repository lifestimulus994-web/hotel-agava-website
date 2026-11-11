const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/booking.js'), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup({ active = true, sale = 140 } = {}) {
  const elements = {}, requests = [], timers = [], windowEvents = {};
  function element(id) {
    if (elements[id]) return elements[id];
    const el = { value: '', hidden: true, options: [], listeners: {}, content: '',
      addEventListener(name, fn) { this.listeners[name] = fn; },
      add(option) { this.options.push(option); if (!this.value) this.value = option.value; },
      set length(n) { this.options.length = n; if (!n) this.value = ''; },
      get textContent() { return this.content; }, set textContent(text) { this.content = text; },
      get innerHTML() { return this.content; }, set innerHTML(text) { this.content = text; }
    };
    elements[id] = el;
    return el;
  }
  const rows = [
    { id: 1, slug: 'standard', base_price: 150, sale_price: sale, sale_active: active, visible: true },
    { id: 2, slug: 'lux', base_price: 300, sale_price: 240, sale_active: true, visible: true }
  ];
  let finishLoad;
  const dbLoad = new Promise(resolve => { finishLoad = resolve; });
  const sb = {
    from() { return { select(columns) {
      assert.ok(columns.includes('sale_price') && columns.includes('sale_active'));
      return { order: () => dbLoad };
    } }; },
    rpc(name, args) {
      assert.equal(name, 'check_availability'); // No booking is created by quoting.
      return new Promise((resolve, reject) => requests.push({ args, resolve, reject }));
    }
  };
  vm.runInNewContext(source, {
    window: { AGAVA_CONFIG: { CONFIGURED: true }, supabase: { createClient: () => sb },
      // A future advertised discount must not become the no-date room price.
      AGAVA_ROOMS: [{ slug: 'standard', name: 'Standard', price: 150, salePrice: 75 },
        { slug: 'lux', name: 'Lux', price: 300 }],
      addEventListener: (name, fn) => { windowEvents[name] = fn; },
      setTimeout: fn => { timers.push(fn); return timers.length; }
    },
    document: { getElementById: element, querySelector: () => null, addEventListener() {} },
    Option: function(text, value) { this.text = text; this.value = value; }
  });
  return {
    el: element, rows, requests,
    load: async () => { finishLoad({ data: rows }); await settle(); },
    dates(ci = '2030-01-20', co = '2030-01-21') {
      element('qbIn').value = ci; element('qbOut').value = co;
      element('qbOut').listeners.change();
    },
    choose(slug) { element('qbRoom').value = slug; element('qbRoom').listeners.change(); },
    refresh: async () => { windowEvents.focus(); timers.shift()(); await settle(); },
    reply(index, total, available = 7) {
      requests[index].resolve({ data: [{ slug: 'standard', total_price: total, available },
        { slug: 'lux', total_price: 240, available: 3 }] });
    }
  };
}

test('room selector uses 140 standing sale; disabled/absent sales restore 150', async () => {
  for (const [settings, expected] of [[{}, 140], [{ active: false }, 150], [{ sale: null }, 150]]) {
    const p = setup(settings);
    assert.equal(p.el('qbRoom').options[0].text, 'Standard');
    await p.load();
    assert.equal(p.el('qbRoom').options[0].text, `Standard — ${expected} ₾/ღამე`);
  }
});

test('selected dates show authoritative 140, calendar 75 and mixed-night total 215', async () => {
  const p = setup(); await p.load();
  p.dates(); p.reply(0, 140); await settle();
  assert.match(p.el('qbTotal').innerHTML, /<strong>140 ₾<\/strong>/);
  assert.equal(p.el('qbRoom').options[0].text, 'Standard — 140 ₾/ღამე');
  p.dates('2030-11-04', '2030-11-05'); p.reply(1, 75); await settle();
  assert.match(p.el('qbTotal').innerHTML, /<strong>75 ₾<\/strong>/);
  p.dates('2030-11-08', '2030-11-10'); p.reply(2, 215); await settle();
  assert.match(p.el('qbTotal').innerHTML, /2 ღამე · ჯამში: <strong>215 ₾<\/strong>/);
  assert.match(p.el('qbRoom').options[0].text, /საშუალოდ 107.5 ₾/);
  assert.deepEqual(p.requests.map(r => [r.args.p_in, r.args.p_out]), [
    ['2030-01-20', '2030-01-21'], ['2030-11-04', '2030-11-05'], ['2030-11-08', '2030-11-10']
  ]);
});

test('late room loading and focus refresh preserve the selected room and use updated sale', async () => {
  const p = setup(); p.choose('lux'); await p.load();
  assert.equal(p.el('qbRoom').value, 'lux');
  p.rows[1].sale_price = 230; await p.refresh();
  assert.equal(p.el('qbRoom').value, 'lux');
  assert.equal(p.el('qbRoom').options[1].text, 'Lux — 230 ₾/ღამე');
});

test('slow prior responses cannot overwrite new dates or room selection', async () => {
  const p = setup(); await p.load();
  p.dates(); p.dates('2030-11-04', '2030-11-05');
  p.reply(1, 75); await settle(); p.reply(0, 140); await settle();
  assert.match(p.el('qbTotal').innerHTML, /<strong>75 ₾<\/strong>/);
  p.dates(); p.choose('lux'); p.reply(3, 140); await settle(); p.reply(2, 75); await settle();
  assert.equal(p.el('qbRoom').value, 'lux');
  assert.match(p.el('qbTotal').innerHTML, /<strong>240 ₾<\/strong>/);
});

test('invalid dates clear the quote and invalidate pending responses', async () => {
  const p = setup(); await p.load(); p.dates(); p.dates('2030-01-20', '');
  p.reply(0, 140); await settle(); assert.equal(p.el('qbTotal').hidden, true);
  p.dates('2030-01-20', '2030-03-20');
  assert.equal(p.requests.length, 1);
  assert.equal(p.el('qbTotal').textContent, 'მაქსიმუმ 30 ღამე.');
});

test('network failure, invalid prices and sold-out rooms never show a misleading estimate', async () => {
  const p = setup(); await p.load();
  p.dates(); p.reply(0, 140); await settle();
  p.dates();
  assert.equal(p.el('qbRoom').options[0].text, 'Standard');
  assert.equal(p.el('qbTotal').textContent, 'მოწმდება ხელმისაწვდომობა…');
  p.requests[1].reject(new Error('offline')); await settle();
  assert.match(p.el('qbTotal').textContent, /ფასი ვერ გადამოწმდა/);
  p.dates(); p.reply(2, null); await settle();
  assert.match(p.el('qbTotal').textContent, /ფასი ვერ გადამოწმდა/);
  p.dates(); p.reply(3, 140, 0); await settle();
  assert.match(p.el('qbTotal').textContent, /დაკავებულია/);
});
