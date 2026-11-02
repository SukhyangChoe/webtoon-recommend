import 'server-only';
import { createHmac } from 'node:crypto';
import { getMatchDatabase } from './database';

type Lease={tokens:number;expires:number};
const local=(globalThis as typeof globalThis & {__wmRateLeases?:Map<string,Lease>}).__wmRateLeases??=new Map<string,Lease>();

/** Small atomic DB leases enforce one shared quota across server instances. */
export async function allowMatchRequest(request: Request) {
  const path=new URL(request.url).pathname,write=!['GET','HEAD','OPTIONS'].includes(request.method);
  const kind=path.endsWith('/webtoons/search')?'search':write?'write':'read';
  const limit=kind==='search'?60:write?40:240;
  const secret=process.env.WEBTOON_MATCH_RATE_LIMIT_SECRET||process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL||process.env.WEBTOON_MATCH_DATABASE_URL;
  if(!secret)throw new Error('MATCH_SERVICE_UNAVAILABLE');
  // Vercel supplies this trusted proxy header; never use the client identity UUID
  // as the quota key, since generating new UUIDs must not reset a request quota.
  const ip=process.env.VERCEL==='1'
    ? (request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim()
    : 'local-development';
  const key=createHmac('sha256',secret).update(`wm-rate-v1:${kind}:${ip}`).digest('hex');
  const now=Date.now(),window=Math.floor(now/60000)*60000,expires=window+60000,leaseKey=`${key}:${window}`;
  const cached=local.get(leaseKey);
  if(cached&&cached.expires>now&&cached.tokens>0){cached.tokens--;return {allowed:true,retryAfter:0};}
  if(local.size>2000){for(const [k,v]of local){if(v.expires<=now)local.delete(k);}if(local.size>2000)local.clear();}
  const leaseSize=write?1:5;
  const rows=await getMatchDatabase().begin(async sql=>{
    await sql.unsafe("set local statement_timeout='1500ms'; set local lock_timeout='500ms'").simple();
    // Retain only short-lived HMAC counters, not IP addresses or user IDs.
    await sql`delete from public.match_api_rate_windows where ctid in
      (select ctid from public.match_api_rate_windows where expires_at<now()-interval '5 minutes' limit 100)`;
    return sql<{granted:number}[]>`insert into public.match_api_rate_windows as r(bucket_key,window_start,consumed,expires_at)
      values(${key},${new Date(window)},${leaseSize},${new Date(expires+5*60000)})
      on conflict(bucket_key,window_start) do update
        set consumed=r.consumed+least(${leaseSize},${limit}-r.consumed)
        where r.consumed<${limit}
      returning least(${leaseSize},consumed) as granted`;
  });
  // Lease size divides every configured quota, so a partial grant cannot occur.
  const granted=Number(rows[0]?.granted||0);
  if(granted>0)local.set(leaseKey,{tokens:granted-1,expires});
  return {allowed:granted>0,retryAfter:Math.max(1,Math.ceil((expires-now)/1000))};
}
