const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/prices.js'),'utf8');
const settle=()=>new Promise(r=>setImmediate(r));
function page({sale=140,active=true,offers=[{room_slug:'standard',price_sale:75,date_from:'2026-11-04',date_to:'2026-11-08'}]}={}) {
 let now='2026-11-04T08:00:00Z', interval, visibility;
 const room={slug:'standard',base_price:150,sale_price:sale,sale_active:active,visible:true};
 const data=[{slug:'standard'}];
 const context={window:{AGAVA_CONFIG:{CONFIGURED:true,SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test'},fetch:true,AGAVA_ROOMS_DATA:data},
 location:{pathname:'/'},Intl,Date:class extends Date {constructor(...args){super(...(args.length?args:[now]));}},
 document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>{visibility=fn;}},
 setInterval:fn=>{interval=fn;},
 fetch:async url=>({ok:true,json:async()=>url.includes('public_discounts')?offers:[room]})};
 vm.runInNewContext(source,context);
 return {data,room,setOffers:value=>{offers=value;},setDate:value=>{now=value;},tick:()=>interval(),resume:()=>visibility()};
}
test('calendar overrides a lower, equal, or higher standing sale',async()=>{
 for(const sale of [60,75,140]) {const p=page({sale});await settle();assert.equal(p.data[0].salePrice,75);}
});
test('future discount remains advertised with its scheduled period',async()=>{
 const p=page({offers:[{room_slug:'standard',price_sale:100,date_from:'2026-11-07',date_to:'2026-11-10'}]});await settle();assert.equal(p.data[0].salePrice,100);
});
test('last night is inclusive; expiry restores standing sale at Tbilisi midnight',async()=>{
 const p=page();await settle();p.setDate('2026-11-08T19:59:59Z');p.tick();await settle();assert.equal(p.data[0].salePrice,75);
 p.setOffers([]);p.setDate('2026-11-08T20:00:00Z');p.tick();await settle();assert.equal(p.data[0].salePrice,140);
});
test('expiry restores base when standing sale disabled or absent',async()=>{
 for(const options of [{active:false},{sale:null}]) {const p=page(options);await settle();p.setOffers([]);p.setDate('2026-11-09T00:00:00Z');p.resume();await settle();assert.equal(p.data[0].price,150);assert.equal(p.data[0].salePrice,0);}
});
test('expired cached offers are ignored and updated room prices are used',async()=>{
 const p=page();await settle();p.room.sale_price=130;p.setDate('2026-11-09T00:00:00Z');p.tick();await settle();assert.equal(p.data[0].salePrice,130);
});
