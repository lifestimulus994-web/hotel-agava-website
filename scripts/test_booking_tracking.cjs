const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync('js/track.js', 'utf8');
function setup(options = {}) {
  const events = [], storage = options.storage || new Map();
  const context = {
    window: {location:{pathname:'/en/'},gtag:(...args)=>events.push(args)},
    document:{addEventListener(){}},
    sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}
  };
  if (options.blocked) context.sessionStorage.getItem = context.sessionStorage.setItem = ()=>{throw Error('blocked');};
  vm.runInNewContext(code,context);
  return {window:context.window,events,storage};
}
const saved={booking_number:'AG-TEST-1',total_price:'270.50',nights:2,manage_token:'secret',guest_email:'private@example.com',guest_name:'Private'};
test('both forms use the persisted total, with currency, language and no guest data',()=>{
  for (const method of ['quick','wizard']) {
    const x=setup();x.window.agavaTrackBooking(saved,{method,room_slug:'standard',guests:2,total:1,email:'private@example.com'});
    const [kind,name,params]=x.events[0];
    assert.equal(kind,'event');assert.equal(name,'booking_submit');assert.equal(params.value,270.50);assert.equal(params.currency,'GEL');
    assert.equal(params.method,method);assert.equal(params.page_lang,'en');assert.equal(params.nights,2);
    assert.deepEqual(Object.keys(params).sort(),['currency','guests','method','nights','page_lang','page_path','room_slug','value'].sort());
    assert.ok(!JSON.stringify(params).includes('secret'));assert.ok(!JSON.stringify(params).includes('private'));
  }
});
test('repeated callbacks and a reload do not count the same saved booking twice',()=>{
  const x=setup();x.window.agavaTrackBooking(saved,{});x.window.agavaTrackBooking(saved,{});assert.equal(x.events.length,1);
  const y=setup({storage:x.storage});y.window.agavaTrackBooking(saved,{});assert.equal(y.events.length,0);
  y.window.agavaTrackBooking({...saved,booking_number:'AG-TEST-2'},{});assert.equal(y.events.length,1);
});
test('failed or empty responses never count as saved bookings',()=>{
  const x=setup();for(const b of [null,undefined,{}, {error:'failed'}, {booking_number:''}])x.window.agavaTrackBooking(b,{});
  assert.equal(x.events.length,0);
});
test('tracking and storage failures never throw into booking success UI',()=>{
  const x=setup({blocked:true});x.window.agavaTrackBooking(saved,{});x.window.agavaTrackBooking(saved,{});assert.equal(x.events.length,1);
  const y=setup();y.window.gtag=()=>{throw Error('analytics unavailable')};assert.doesNotThrow(()=>y.window.agavaTrackBooking(saved,{}));
  y.window.gtag=undefined;assert.doesNotThrow(()=>y.window.agavaTrackBooking(saved,{}));
});
test('invalid totals are omitted, and a zero total is retained',()=>{
  for(const price of [null,undefined,'',-1,'NaN',Infinity]){
    const x=setup();x.window.agavaTrackBooking({...saved,total_price:price},{});assert.equal(x.events[0][2].value,undefined);assert.equal(x.events[0][2].currency,undefined);
  }
  const x=setup();x.window.agavaTrackBooking({...saved,total_price:0},{});assert.equal(x.events[0][2].value,0);
});
