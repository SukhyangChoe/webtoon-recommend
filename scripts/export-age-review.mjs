// Read-only export of the previously reported 9,074 records. No taste vectors or user data.
import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

// Frozen historical classifier: do not replace with the current serving policy.
function previousClassification(metadata={}) {
  const text=value=>String(value??'').toLowerCase();
  const ratings=[metadata.ageRating,metadata.ageRatingRaw].map(text);
  const general=ratings.some(r=>/^(전체(연령|이용)?가?|전체이용가|전체연령가|일반이용가|allages|all|0|7|12|15|7세(이용가|이상)?|12세(이용가|이상)?|15세(이용가|이상)?)$/.test(r.replace(/\s/g,'')));
  const adultText=ratings.some(r=>/(18|19|성인|청소년[^가-힣]*이용[^가-힣]*불가|청소년관람불가|adult|mature)/.test(r.replace(/(성인|19세|18세)\s*표시\s*없음/g,'')));
  const flag=text(metadata.isAdult)==='true'||text(metadata.sexualCore)==='true';
  if(!flag&&!adultText&&general)return 'safe';
  if((flag||adultText)&&(general||text(metadata.isAdult)==='false'))return 'review';
  return flag||adultText?'adult':'unknown';
}
function reviewReason(metadata={}) {
  if(metadata.sexualCore===true&&metadata.isAdult===false)return 'sexualCore=true / isAdult=false (새 차단 기준에서는 허용)';
  if(metadata.isAdult===false&&[metadata.ageRating,metadata.ageRatingRaw].some(v=>/^(18|19)세(\s*이용가)?$/.test(String(v??''))))return 'isAdult=false와 18·19세 등급 불일치';
  if(/별도|완전판|일반판|개정판/.test(String(metadata.ageRating??'')+' '+String(metadata.ageRatingRaw??'')))return '대표 판본과 별도 성인 판본 구분 확인';
  return '등급 설명 문구 재확인 (성인 등급 확정 아님)';
}
function unknownReason(metadata={}) {
  if([metadata.isAdult,metadata.sexualCore,metadata.ageRating,metadata.ageRatingRaw].every(v=>v==null))return '주요 등급 필드 미기재';
  if([metadata.ageRating,metadata.ageRatingRaw].some(v=>String(v??'')==='전체/일반 이용가'))return '기존 필터가 전체/일반 이용가 문구를 미인식';
  return '등급 unknown·미표시 또는 기존 필터 미인식 문구';
}
const output=process.argv.find(arg=>arg.startsWith('--output-dir='))?.slice('--output-dir='.length);
if(!output||!path.isAbsolute(output))throw new Error('Absolute --output-dir is required');
const sql=postgres(process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL||process.env.WEBTOON_MATCH_DATABASE_URL,{max:1,prepare:false,ssl:'require',connect_timeout:5,onnotice:()=>{}});
try {
  const payload=await sql.begin('isolation level repeatable read read only',async tx=>{
    await tx.unsafe("set local statement_timeout='6000ms'");
    const rows=await tx`select w.canonical_webtoon_id,w.title,w.platform,w.official_url,w.recommendation_eligible,
      w.raw_data->'metadata'->'isAdult' as is_adult,w.raw_data->'metadata'->'sexualCore' as sexual_core,
      w.raw_data#>>'{metadata,ageRating}' as age,w.raw_data#>>'{metadata,ageRatingRaw}' as age_raw,
      d.imported_data->>'ageRating' as detail_age
      from public.webtoons w left join public.webtoon_details d using(canonical_webtoon_id)
      where w.catalog_status='active' order by w.platform,w.title,w.canonical_webtoon_id`;
    const groups={safe:[],adult:[],review:[],unknown:[]};
    const flaggedTypes={},ambiguities=[],policyAmbiguities=[];let newBlocked=0;
    for(const row of rows) {
      const metadata={isAdult:row.is_adult,sexualCore:row.sexual_core,ageRating:row.age,ageRatingRaw:row.age_raw};
      const old=previousClassification(metadata);
      const item={canonicalWebtoonId:row.canonical_webtoon_id,title:row.title,platform:row.platform,officialUrl:row.official_url,
        isAdult:row.is_adult,isAdultType:row.is_adult===null?'missing':typeof row.is_adult,sexualCore:row.sexual_core,
        ageRating:row.age,ageRatingRaw:row.age_raw,detailAgeRating:row.detail_age,recommendationEligible:row.recommendation_eligible,
        reason:old==='unknown'?unknownReason(metadata):old==='review'?reviewReason(metadata):null,
        confirmedIsAdult:null,confirmedAgeRating:null,evidenceUrl:null,confirmedEdition:null,reviewNote:null};
      groups[old].push(item);
      const value=String(row.is_adult??'').trim().toLowerCase();
      flaggedTypes[`${item.isAdultType}:${String(row.is_adult)}`]=(flaggedTypes[`${item.isAdultType}:${String(row.is_adult)}`]||0)+1;
      if(value==='true')newBlocked++;
      const exactAdult=[row.age,row.age_raw].some(v=>/^(18|19)(세(이용가|이상|미만이용불가)?)?$|^(성인|성인이용가|청소년이용불가|청소년관람불가|adult|mature)$/i.test(String(v??'').replace(/\s/g,'')));
      if(value!=='true'&&exactAdult) {
        const candidate={...item,reason:'isAdult가 true가 아니지만 별도 등급 필드가 성인 등급'};
        ambiguities.push(candidate);policyAmbiguities.push(candidate);
      }
      if(value==='true'&&[row.age,row.age_raw].some(v=>/^(전체(연령|이용)?가?|전체이용가|전체연령가|일반이용가|allages|all|0|7|12|15|7세(이용가|이상)?|12세(이용가|이상)?|15세(이용가|이상)?)$/.test(String(v??'').toLowerCase().replace(/\s/g,''))))policyAmbiguities.push({...item,reason:'isAdult=true이지만 별도 등급 필드에 비성인 등급도 기록됨'});
      if(row.is_adult!=null&&typeof row.is_adult!=='boolean'&&!['true','false'].includes(value))policyAmbiguities.push({...item,reason:'isAdult 칸에 참·거짓이 아닌 값이 들어 있음'});
    }
    if(groups.unknown.length!==9074||groups.review.length!==122)throw new Error('CATALOG_CHANGED_RECONCILE_BEFORE_EXPORT');
    return {exportedAt:new Date().toISOString(),source:'현재 서비스 DB의 활성 카탈로그',scope:'이전 엄격 등급 필터의 미확인·문구 미인식 9,074편을 고정 추출. 성인 판정 확정 목록 아님.',
      counts:{active:rows.length,previous:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),newBlocked,newAllowed:rows.length-newBlocked,isAdultValues:flaggedTypes},
      unconfirmed:groups.unknown,additionalReview:groups.review,adultRatingWithoutAdultFlag:ambiguities,policyAmbiguities};
  });
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,'age-review-data.json'),JSON.stringify(payload,null,2));
  console.log(JSON.stringify({output,counts:payload.counts,policyAmbiguities:payload.policyAmbiguities.map(({canonicalWebtoonId,title,isAdult,ageRating,reason})=>({canonicalWebtoonId,title,isAdult,ageRating,reason}))}));
}catch(error){console.error({error:error.code||error.message});process.exitCode=1;}
finally{await sql.end({timeout:1});}
