const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '../js/', name), 'utf8');
function setup({width=5712, height=4284, failUpload=0, badEncoder=false, large=false}={}) {
  const uploaded=[], removed=[], decoded=[];
  let active=0, maxActive=0;
  const storage={
    async upload(p,blob,options) { uploaded.push({p,blob,options}); return {error: uploaded.length === failUpload ? new Error('storage failed') : null}; },
    async remove(paths) {removed.push(...paths);return {};},
    getPublicUrl(p) {return {data:{publicUrl:'https://photos.test/storage/v1/object/public/site-photos/'+p}};}
  };
  const window={AGAVA_CONFIG:{CONFIGURED:true,SUPABASE_URL:'https://photos.test',SUPABASE_ANON_KEY:'test'},
    supabase:{createClient:()=>({storage:{from:()=>storage},from:()=>({delete:()=>({eq:async()=>({})})})})},
    async createImageBitmap(file) { active++;maxActive=Math.max(active,maxActive);decoded.push(file); await Promise.resolve(); return {width,height,close(){active--;}};}
  };
  const context={window,document:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toBlob(cb,type,quality){cb({type:badEncoder?'image/png':type,size:large?500000:Math.round(this.width*100*quality)});}})}};
  vm.runInNewContext(source('image-upload.js'),context);
  vm.runInNewContext(source('content.js'),context);
  return {window,uploaded,removed,decoded,maxActive:()=>maxActive};
}
const file={name:'camera.jpeg',type:'image/jpeg',size:6231481};
test('large photo uploads only bounded WebP variants and publishes their primary URL',async()=>{
 const s=setup(); const result=await s.window.AGAVA_STORE.uploadFile(file);
 assert.equal(s.uploaded.length,3);
 assert.ok(result.url.endsWith('-1600w.webp'));
 for (const u of s.uploaded) {assert.notEqual(u.blob,file);assert.equal(u.blob.type,'image/webp');assert.ok(u.blob.size<=307200);assert.equal(u.options.contentType,'image/webp');}
 const set=s.window.AGAVA_STORE.imageSrcset(result.url);
 for(const w of [480,800,1600])assert.ok(set.includes('-'+w+'w.webp '+w+'w'));
});
test('small photo is not enlarged and has only its actual width in srcset',async()=>{
 const s=setup({width:320,height:240});const result=await s.window.AGAVA_STORE.uploadFile(file);
 assert.equal(s.uploaded.length,1);assert.ok(result.url.endsWith('-320w.webp'));assert.ok(!s.window.AGAVA_STORE.imageSrcset(result.url).includes('480w'));
});
test('portrait photo limits the longest edge without stretching',async()=>{
 const s=setup({width:3000,height:6000});const variants=await s.window.AGAVA_PREPARE_PHOTO(file);
 assert.deepEqual(Array.from(variants,v=>[v.width,v.height]),[[480,960],[800,1600]]);
});
test('failed variant upload never returns a publishable URL and removes partial files',async()=>{
 const s=setup({failUpload:2});await assert.rejects(s.window.AGAVA_STORE.uploadFile(file),/storage failed/);
 assert.deepEqual(s.removed,[s.uploaded[0].p]);
});
test('unsupported, oversized, encoder and size-budget failures never upload originals',async()=>{
 for(const [settings,input] of [[{}, {...file,type:'image/gif'}],[{}, {...file,size:31*1024*1024}],[{badEncoder:true},file],[{large:true},file]]){
  const s=setup(settings);await assert.rejects(s.window.AGAVA_STORE.uploadFile(input));assert.equal(s.uploaded.length,0);
 }
});
test('batch preparation releases each decoded image before starting the next',async()=>{
 const s=setup();await Promise.all([1,2,3].map(()=>s.window.AGAVA_PREPARE_PHOTO(file)));assert.equal(s.maxActive(),1);
});
test('deleting managed photo removes every variant; legacy photo removes only itself',async()=>{
 const s=setup();const result=await s.window.AGAVA_STORE.uploadFile(file);await s.window.AGAVA_STORE.deleteImage(1,result.url);
 assert.deepEqual(s.removed,s.uploaded.map(u=>u.p));
 const legacy='https://photos.test/storage/v1/object/public/site-photos/img/legacy.jpeg';await s.window.AGAVA_STORE.deleteImage(2,legacy);assert.equal(s.removed.at(-1),'img/legacy.jpeg');
});
