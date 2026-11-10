const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ADMIN = 'agavahoteltbilisi@gmail.com';
export function messageFor(job, from) {
  const b = job.payload;
  if (!['guest','admin'].includes(job.kind) || !b?.booking_number) throw new Error('invalid_job');
  if (b.total_price === null || b.total_price === undefined || b.total_price === '' ||
      !Number.isFinite(Number(b.total_price)) || Number(b.total_price) < 0) throw new Error('invalid_total');
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(job.recipient)) throw new Error('invalid_recipient');
  const admin = job.kind === 'admin';
  if (admin && job.recipient !== ADMIN) throw new Error('invalid_admin');
  const received = 'ჯავშნის მოთხოვნა მიღებულია / Booking request received';
  const title = admin ? 'ახალი ჯავშანი საიტიდან / New website booking' : received;
  // The saved booking starts pending; never claim payment or final confirmation.
  const intro = admin ? 'საიტზე ახალი ჯავშნის მოთხოვნა შემოვიდა. გადაამოწმეთ და დაუკავშირდით სტუმარს.' :
    'თქვენი მოთხოვნა შენახულია. სასტუმრო დაგიკავშირდებათ დასადასტურებლად. / Your request has been saved. The hotel will contact you to confirm your stay.';
  const rows = [
    ['ჯავშანი / Booking', b.booking_number],['სტუმარი / Guest',b.guest_name],
    ['ნომერი / Room',b.room_name],['შესვლა / Check-in',b.check_in],['გასვლა / Check-out',b.check_out],
    ['ღამეები / Nights',b.nights],['სტუმრები / Guests',b.guests],
    ['საუზმე / Breakfast',b.breakfast ? 'კი / Yes' : 'არა / No'],
    ['სულ / Total',Number(b.total_price).toFixed(2)+' GEL'],
    ['სტატუსი / Status','მოთხოვნა მიღებულია / Awaiting confirmation']
  ];
  if (admin) rows.push(['ტელეფონი / Phone',b.guest_phone],['ელფოსტა / Email',b.guest_email || '—']);
  const link = admin ? 'https://hotelagava.ge/admin' :
    (/^[0-9a-f-]{36}$/i.test(b.manage_token || '') ? 'https://hotelagava.ge/manage.html?t='+encodeURIComponent(b.manage_token) : null);
  const label = admin ? 'ადმინ პანელი / Admin panel' : 'ჯავშნის მართვა / Manage your booking';
  const text = [title,intro,...rows.map(([k,v])=>k+': '+v),link?label+': '+link:'',
    'Hotel Agava · Akaki Beliashvili 161, Tbilisi · +995 597 12 12 12',
    'კითხვებისთვის უპასუხეთ ამ წერილს. / Reply to this email if you need help.'].join('\n\n');
  const html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#241d14;line-height:1.6">'+
    '<h1 style="font-size:22px">'+escapeHTML(title)+'</h1><p>'+escapeHTML(intro)+'</p><table>'+rows.map(([k,v])=>
      '<tr><th scope="row" style="text-align:left;padding:8px;border-bottom:1px solid #ddd">'+escapeHTML(k)+'</th><td style="padding:8px;border-bottom:1px solid #ddd">'+escapeHTML(v)+'</td></tr>').join('')+'</table>'+
    (link?'<p><a href="'+escapeHTML(link)+'">'+escapeHTML(label)+'</a></p>':'')+
    '<p>Hotel Agava · Akaki Beliashvili 161, Tbilisi<br>+995 597 12 12 12</p><p>კითხვებისთვის უპასუხეთ ამ წერილს. / Reply to this email if you need help.</p></body></html>';
  return {from,to:[job.recipient],reply_to:ADMIN,subject:title+' — '+String(b.booking_number).replace(/[\r\n]/g,''),html,text};
}
export async function deliver(job, config, fetcher = fetch) {
  let message;
  try { message=messageFor(job,config.from); } catch { return {error:'invalid_job',retry:false}; }
  try {
    const res=await fetcher('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json','Idempotency-Key':'agava-booking/'+job.id},
      body:JSON.stringify(message),signal:AbortSignal.timeout(15000)
    });
    const data=await res.json().catch(()=>({}));
    if (res.ok && typeof data.id==='string' && data.id) return {providerId:data.id,retry:false};
    // Store status only, never provider responses containing guest data or credentials.
    return {error:'provider_http_'+res.status,retry:res.status===429 || res.status>=500};
  } catch { return {error:'provider_network_error',retry:true}; }
}
