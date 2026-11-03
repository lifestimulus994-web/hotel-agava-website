const assert = require('node:assert/strict');
const {test} = require('node:test');
const {expected, published, watch} = require('../js/seo-publish.js');
const defaults = {title:'Hotel',description:'Stay in Tbilisi',og_image:'https://hotelagava.ge/assets/a.webp',robots:'index, follow'};
const tick = () => new Promise(resolve => setImmediate(resolve));
test('empty overrides restore defaults; every language is a separate path', () => {
  const target=expected({title:' New title ',description:''},defaults);
  assert.equal(target.title,'New title');assert.equal(target.description,defaults.description);
  const pages=[{path:'/en/',applied:target}];
  assert.ok(published(pages,'/en/',target));assert.equal(published(pages,'/ru/',target),false);
  assert.equal(published([{path:'/en/',applied:defaults}],'/en/',target),false);
});
test('saved but stale catalog stays pending, then confirms actual deployed values',async()=>{
  const events=[];let next,reads=0;
  watch('/tr/',defaults,defaults,state=>events.push(state),{fetch:async()=>({ok:true,json:async()=>++reads===1?[]:[{path:'/tr/',applied:defaults}]}),setTimeout:fn=>{next=fn;return 1;},clearTimeout:()=>{}});
  await tick();assert.deepEqual(events,['pending']);await next();assert.deepEqual(events,['pending','published']);
});
test('network failures never claim publication; deadline is explicit',async()=>{
  const events=[];watch('/',defaults,defaults,state=>events.push(state),{fetch:async()=>{throw Error('offline');},maxAttempts:1});
  await tick();assert.deepEqual(events,['pending','delayed']);
});
test('changing pages cancels stale status from an in-flight request',async()=>{
  const events=[];let resolve;
  const stop=watch('/',defaults,defaults,state=>events.push(state),{fetch:()=>new Promise(r=>resolve=r)});
  stop();resolve({ok:true,json:async()=>[{path:'/',applied:defaults}]});await tick();assert.deepEqual(events,['pending']);
});
