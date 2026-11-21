/**
 * Server-side proxy for BMKG Yogyakarta CMAX PNG frames (UTC).
 * GET /api/radar?frame=YYYYMMDD-HHMM
 * This proxy does not guarantee that BMKG accepts Cloudflare requests.
 */
const SITE_ORIGIN='https://firdausrakh.github.io';
const UPSTREAM_ROOT='https://stamet-yogya.bmkg.go.id/cache/radar/YOG/CMAX/';
const CORS={
 'Access-Control-Allow-Origin':SITE_ORIGIN,
 'Access-Control-Allow-Methods':'GET, OPTIONS',
 'Access-Control-Allow-Headers':'Content-Type',
 'Vary':'Origin',
 'X-Content-Type-Options':'nosniff'
};
const PNG_MAGIC=[137,80,78,71,13,10,26,10];
function fail(status,message,extra={}){
 return new Response(JSON.stringify({ok:false,message,...extra}),{
  status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
 });
}
function validFrame(frame){
 if(!/^\d{8}-\d{4}$/.test(frame))return false;
 const y=+frame.slice(0,4),mo=+frame.slice(4,6),d=+frame.slice(6,8),hh=+frame.slice(9,11),mm=+frame.slice(11,13);
 const dt=new Date(Date.UTC(y,mo-1,d,hh,mm));
 return y>=2020&&y<=2100&&dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===mo&&dt.getUTCDate()===d&&dt.getUTCHours()===hh&&dt.getUTCMinutes()===mm;
}
export default{
 async fetch(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(request.method!=='GET')return fail(405,'Only GET and OPTIONS are supported.');
  const url=new URL(request.url);
  if(url.pathname!=='/api/radar')return fail(404,'Use /api/radar?frame=20261121-0120');
  const frame=url.searchParams.get('frame')||'';
  if(!validFrame(frame))return fail(400,'Invalid UTC frame; expected YYYYMMDD-HHMM.');
  const upstreamURL=UPSTREAM_ROOT+frame.slice(0,8)+'/YOG-'+frame+'.png';
  let upstream;
  try{
   upstream=await fetch(upstreamURL,{redirect:'manual',cf:{cacheEverything:true,cacheTtl:120}});
  }catch(e){
   return fail(502,'Cloudflare Worker cannot reach the BMKG origin.',{reason:String(e?.message||e).slice(0,200)});
  }
  if(!upstream.ok)return fail(502,'BMKG origin refused or did not have this frame.',{upstreamStatus:upstream.status,frame});
  if(Number(upstream.headers.get('content-length'))>8_000_000)return fail(502,'Upstream image is unexpectedly large.');
  let data;
  try{data=await upstream.arrayBuffer();}catch{return fail(502,'Could not read BMKG image response.');}
  const bytes=new Uint8Array(data);
  if(bytes.length>8_000_000||bytes.length<8||!PNG_MAGIC.every((b,i)=>bytes[i]===b))return fail(502,'BMKG did not return a valid PNG image.',{frame});
  return new Response(data,{status:200,headers:{...CORS,'Content-Type':'image/png','Cache-Control':'public, max-age=120','X-Radar-UTC':frame,'X-Data-Source':'BMKG Yogyakarta'}});
 }
};