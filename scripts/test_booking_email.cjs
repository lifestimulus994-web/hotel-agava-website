const test = require('node:test');
const assert = require('node:assert/strict');
const token='11111111-1111-4111-8111-111111111111';
const job={id:'test-job',kind:'guest',recipient:'guest@example.com',payload:{booking_number:'AG-TEST',room_name:'Standard',guest_name:'<script>alert("x")</script>',guest_phone:'+995000000000',guest_email:'guest@example.com',check_in:'2026-12-01',check_out:'2026-12-03',nights:2,guests:2,total_price:'270.50',breakfast:true,status:'pending',manage_token:token}};
const config={from:'Hotel Agava <reservations@bookings.hotelagava.ge>',apiKey:'test-secret'};
const modulePromise=import('../supabase/functions/booking-email/email.mjs');
test('guest receipt uses saved details, correct manage URL, escaped HTML and pending wording',async()=>{
 const {messageFor}=await modulePromise;const m=messageFor(job,config.from);
 assert.deepEqual(m.to,['guest@example.com']);assert.equal(m.reply_to,'agavahoteltbilisi@gmail.com');
 assert.ok(m.text.includes('270.50 GEL'));assert.ok(m.text.includes('https://hotelagava.ge/manage.html?t='+token));
 assert.ok(m.text.includes('Awaiting confirmation'));assert.ok(m.html.includes('&lt;script&gt;'));assert.ok(!m.html.includes('<script>'));
 assert.ok(!m.text.includes('test-secret'));
});
test('admin gets the admin panel, not the guest secret or an arbitrary recipient',async()=>{
 const {messageFor}=await modulePromise;const m=messageFor({...job,kind:'admin',recipient:'agavahoteltbilisi@gmail.com'},config.from);
 assert.ok(m.text.includes('https://hotelagava.ge/admin'));assert.ok(!m.text.includes(token));assert.ok(m.text.includes(job.payload.guest_phone));
 assert.throws(()=>messageFor({...job,kind:'admin'},config.from));
});
test('retries keep the same idempotency key and exact message',async()=>{
 const {deliver}=await modulePromise;const requests=[];let attempt=0;
 const mock=async(url,req)=>{requests.push(req);attempt++;return new Response(JSON.stringify(attempt===1?{message:'private provider error'}:{id:'email-id'}),{status:attempt===1?429:200});};
 assert.deepEqual(await deliver(job,config,mock),{error:'provider_http_429',retry:true});
 assert.deepEqual(await deliver(job,config,mock),{providerId:'email-id',retry:false});
 assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);assert.equal(requests[0].body,requests[1].body);
});
test('transient failures retry; invalid recipients and provider validation failures do not',async()=>{
 const {deliver}=await modulePromise;
 assert.deepEqual(await deliver(job,config,async()=>{throw Error('secret');}),{error:'provider_network_error',retry:true});
 assert.deepEqual(await deliver(job,config,async()=>new Response('{}',{status:500})),{error:'provider_http_500',retry:true});
 assert.deepEqual(await deliver(job,config,async()=>new Response('{}',{status:422})),{error:'provider_http_422',retry:false});
 assert.deepEqual(await deliver({...job,recipient:'bad\r\nrecipient'},config,()=>{throw Error('should not send')}),{error:'invalid_job',retry:false});
});
test('invalid saved prices cannot become zero-price receipts',async()=>{
 const {deliver}=await modulePromise;
 for(const total_price of [null,undefined,'','bad',-1]) {
   assert.deepEqual(await deliver({...job,payload:{...job.payload,total_price}},config,()=>{throw Error('must not send');}),{error:'invalid_job',retry:false});
 }
});
const workerEnv = name => ({BOOKING_EMAIL_WORKER_SECRET:'worker-secret',RESEND_API_KEY:'resend-secret',BOOKING_EMAIL_FROM:config.from,SUPABASE_SERVICE_ROLE_KEY:'database-secret',SUPABASE_URL:'https://db.example.com'})[name];
test('worker denies unauthenticated requests before querying or sending',async()=>{
 const {createHandler}=await import('../supabase/functions/booking-email/worker.mjs');
 let calls=0;const handler=createHandler(workerEnv,async()=>{calls++;throw Error('must not fetch');});
 assert.equal((await handler(new Request('https://worker.example.com',{method:'POST'}))).status,401);
 assert.equal((await handler(new Request('https://worker.example.com',{method:'GET'}))).status,405);
 assert.equal(calls,0);
 assert.equal((await createHandler(()=>undefined)(new Request('https://worker.example.com',{method:'POST'}))).status,503);
});
test('worker acknowledges guest failures and admin success independently using each lease',async()=>{
 const {createHandler}=await import('../supabase/functions/booking-email/worker.mjs');
 const acknowledgements=[];let sends=0;
 const jobs=[{...job,lease_token:'lease-guest'},{...job,id:'admin-job',kind:'admin',recipient:'agavahoteltbilisi@gmail.com',lease_token:'lease-admin'}];
 const handler=createHandler(workerEnv,async(url,req)=>{
   if(url.endsWith('/claim_booking_emails'))return Response.json(jobs);
   if(url.endsWith('/finish_booking_email')){acknowledgements.push(JSON.parse(req.body));return new Response(null,{status:204});}
   sends++;return sends===1?Response.json({},{status:429}):Response.json({id:'admin-email-id'});
 },async()=>{});
 const response=await handler(new Request('https://worker.example.com',{method:'POST',headers:{Authorization:'Bearer worker-secret'}}));
 assert.equal(response.status,200);assert.equal(sends,2);
 assert.deepEqual(acknowledgements,[
   {p_id:job.id,p_lease:'lease-guest',p_provider_id:null,p_error:'provider_http_429',p_retry:true},
   {p_id:'admin-job',p_lease:'lease-admin',p_provider_id:'admin-email-id',p_error:null,p_retry:false}
 ]);
});
test('worker reports database failure without exposing credentials or losing the lease',async()=>{
 const {createHandler}=await import('../supabase/functions/booking-email/worker.mjs');
 const handler=createHandler(workerEnv,async(url)=>{
   if(url.endsWith('/claim_booking_emails'))return Response.json([{...job,lease_token:'lease'}]);
   if(url.endsWith('/finish_booking_email'))return new Response('private database error',{status:500});
   return Response.json({id:'already-accepted'});
 },async()=>{});
 const response=await handler(new Request('https://worker.example.com',{method:'POST',headers:{Authorization:'Bearer worker-secret'}}));
 assert.equal(response.status,503);assert.equal(await response.text(),'Worker failed; queued jobs retained');
});
