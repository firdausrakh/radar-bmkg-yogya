const BASE='https://gis.bmkg.go.id/arcgis/rest/services/radarcmax/MapServer/export';
const PREFIX='cmax/frames/';
const INDEX='cmax/index.json';
const ORIGIN='https://firdausrakh.github.io';
const pngSig=[137,80,78,71,13,10,26,10];
const cors={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Vary':'Origin','X-Content-Type-Options':'nosniff'};
const out=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
function merc(lng,lat){lat=Math.max(-85.05112878,Math.min(85.05112878,lat));return [6378137*lng*Math.PI/180,6378137*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))]}
function upstreamURL(){
 const sw=merc(108.10544461,-9.97969483),ne=merc(112.60164654,-5.48474466);
 const p=new URLSearchParams({bbox:[sw[0],sw[1],ne[0],ne[1]].join(','),bboxSR:'3857',imageSR:'3857',size:'1024,1024',format:'png32',transparent:'true',f:'image'});
 return BASE+'?'+p.toString();
}
async function indexOf(env){
 const f=await env.RADAR_BUCKET.get(INDEX);
 return f?JSON.parse(await f.text()):{version:1,source:'BMKG ArcGIS CMAX',latest:null,updatedAt:null,checkedAt:null,frames:[]};
}
async function capture(env){
 if(!env.RADAR_BUCKET)throw Error('R2 binding RADAR_BUCKET not configured');
 const res=await fetch(upstreamURL(),{redirect:'manual'});
 if(!res.ok)throw Error('BMKG ArcGIS HTTP '+res.status);
 const data=new Uint8Array(await res.arrayBuffer());
 if(data.length<8||data.length>12000000||!pngSig.every((v,i)=>data[i]===v))throw Error('Not a valid PNG or unexpected file size');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const at=new Date().toISOString(),idx=await indexOf(env);
 idx.checkedAt=at;
 if(idx.latest?.sha256===hash){
   await env.RADAR_BUCKET.put(INDEX,JSON.stringify(idx),{httpMetadata:{contentType:'application/json'}});
   return {stored:false,reason:'Identical to latest snapshot',checkedAt:at};
 }
 const key=PREFIX+at.slice(0,10)+'/'+at.replace(/[:.]/g,'-')+'.png';
 await env.RADAR_BUCKET.put(key,data,{httpMetadata:{contentType:'image/png'},customMetadata:{capturedAt:at,sha256:hash}});
 const frame={key,capturedAt:at,observationTime:null,sha256:hash,bytes:data.length,coordinates:[[108.10544461,-5.48474466],[112.60164654,-5.48474466],[112.60164654,-9.97969483],[108.10544461,-9.97969483]]};
 idx.frames.unshift(frame);idx.latest=frame;idx.updatedAt=at;
 const old=idx.frames.splice(1008);
 await env.RADAR_BUCKET.put(INDEX,JSON.stringify(idx),{httpMetadata:{contentType:'application/json'}});
 await Promise.all(old.map(x=>env.RADAR_BUCKET.delete(x.key)));
 return {stored:true,frame};
}
export default {
 async scheduled(event,env,ctx){ctx.waitUntil(capture(env).catch(e=>console.error('Capture failed:',e.message)))},
 async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='GET')return out({error:'Only GET supported'},405);
  if(!env.RADAR_BUCKET)return out({error:'Missing RADAR_BUCKET binding'},503);
  const u=new URL(request.url);
  if(u.pathname==='/api/frames')return out(await indexOf(env));
  if(u.pathname==='/api/latest')return out((await indexOf(env)).latest);
  if(u.pathname.startsWith('/api/frame/')){
    const key=decodeURIComponent(u.pathname.slice('/api/frame/'.length));
    if(!/^cmax\/frames\/\d{4}-\d{2}-\d{2}\/[\dTZ-]+\.png$/.test(key))return out({error:'Invalid key'},400);
    const obj=await env.RADAR_BUCKET.get(key);
    return obj?new Response(obj.body,{headers:{...cors,'Content-Type':'image/png','Cache-Control':'public,max-age=604800'}}):out({error:'Not found'},404);
  }
  if(u.pathname==='/api/collect'){
    if(!env.SNAPSHOT_TOKEN)return out({error:'Manual collection disabled'},403);
    if(request.headers.get('Authorization')!=='Bearer '+env.SNAPSHOT_TOKEN)return out({error:'Unauthorized'},401);
    try{return out(await capture(env))}catch(e){return out({error:e.message},502)}
  }
  return out({ok:true,endpoints:['/api/frames','/api/latest','/api/frame/{key}'],note:'Configure cron and R2 binding'});
 }
};