import { deliver } from './email.mjs';

export function createHandler(env, fetcher = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
 return async request => {
  const secret=env('BOOKING_EMAIL_WORKER_SECRET');
  const key=env('RESEND_API_KEY');
  const from=env('BOOKING_EMAIL_FROM');
  const serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
  const url=env('SUPABASE_URL');
  if (!secret || !key || !from || !serviceKey || !url) return new Response('Not configured',{status:503});
  if (request.method!=='POST') return new Response('Method not allowed',{status:405});
  // No public email-sending API: only the scheduled backend worker knows this secret.
  const supplied=request.headers.get('Authorization') || '';
  const digest=async (value)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [expected,actual]=await Promise.all([digest('Bearer '+secret),digest(supplied)]);
  let mismatch=0;for(let i=0;i<expected.length;i++) mismatch |= expected[i]^actual[i];
  if(mismatch) return new Response('Unauthorized',{status:401});
  const rpc=async(name,body)=>{
    const r=await fetcher(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new Error('Database operation failed');
    const text=await r.text();return text?JSON.parse(text):null;
  };
  try {
    const jobs=await rpc('claim_booking_emails',{});
    for(const job of jobs){
      const result=await deliver(job,{apiKey:key,from},fetcher);
      await rpc('finish_booking_email',{p_id:job.id,p_lease:job.lease_token,p_provider_id:result.providerId||null,p_error:result.error||null,p_retry:result.retry});
      await pause(600);
    }
    return Response.json({processed:jobs.length});
  } catch {
    // A lease expires and retries use the same provider idempotency key.
    return new Response('Worker failed; queued jobs retained',{status:503});
  }
 };
}
