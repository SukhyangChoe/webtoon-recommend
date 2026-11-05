import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDailyRequest } from '../../src/features/match/server/dailyRecommendation/requestAdapter.mjs';
import { dailyWindow, DAILY_INPUT_MAPPING_APPROVED } from '../../src/features/match/server/dailyRecommendation/policy.mjs';
import { createDailySelector, dailySelectionKey } from '../../src/features/match/server/dailyRecommendation/runtime02.mjs';
import { genreSupport, withDailyGenrePreference } from '../../src/features/match/server/dailyRecommendation/genrePreference.mjs';
import { buildTasteSnapshot } from '../../src/features/match/engine/resultEngine.mjs';
import { applyRecommendationTaste } from '../../src/features/match/engine/recommendationTasteEngine.mjs';
const seed=JSON.parse(fs.readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json',import.meta.url),'utf8'));
const input=()=>({snapshotId:'snapshot',profileId:'profile',completedAt:'2026-11-01T00:00:00Z',questionSetVersion:seed.questionSetVersion,
 answers:{genre:{fantasy:'high'},appeal:['appeal_action_catharsis','appeal_growth_training'],characterRelationship:['character_effortful_protagonist'],avoidance:['avoid_repetition']},recommendations:[]});
const work={canonicalWebtoonId:'work-a',title:'실제 작품',platform:'플랫폼',recommendation:{tagScores:{action_catharsis:3,growth:3},contentAxisScores:{combat_growth:3,martial_training:3},typeScores:{fantasy:{fantasy_orthodox_growth:3}}}};
const context={rows:[work],byId:new Map([[work.canonicalWebtoonId,work]])};
test('KST midnight is the exact daily boundary, independent of host timezone',()=>{
 assert.equal(dailyWindow('2026-11-04T14:59:59.999Z').day,'2026-11-04');
 assert.equal(dailyWindow('2026-11-04T15:00:00.000Z').day,'2026-11-05');
 assert.equal(dailyWindow('2026-11-04T14:59:59Z').expiresAt,'2026-11-04T15:00:00.000Z');
 assert.throws(()=>dailyWindow('bad'),/INVALID/);
});
test('personalized selection is active without a hidden preview flag',()=>assert.equal(DAILY_INPUT_MAPPING_APPROVED,true));
test('documented product rules and complete active input mapping agree',()=>{
 const contract=JSON.parse(fs.readFileSync(new URL('../../src/features/match/server/dailyRecommendation/inputMapping.contract.json',import.meta.url),'utf8'));
 assert.equal(contract.personalizedReleaseAllowed,DAILY_INPUT_MAPPING_APPROVED);
 assert.equal(contract.approvedProductRules.maxWorks,3);assert.equal(contract.approvedProductRules.reExposureCooldownDays,0);
 assert.equal(contract.approvedProductRules.timeZone,'Asia/Seoul');
 assert.equal(contract.status,'ACTIVE');assert.ok(contract.mappings.every(item=>item.target));
});
test('active adapter uses original selected labels, not an already-blended vector or arbitrary genre examples',()=>{
 const original=input();original.tasteVector={tagScores:{fabricated:3}};
 const {request,audit}=buildDailyRequest(original,seed,context);
 assert.equal(audit.status,'ACTIVE');
 assert.equal(request.currentIntent.requirements.length,4);
 assert.equal(request.currentIntent.requirements[0].mappings[0].relation,'exact');
 assert.ok(request.currentIntent.requirements[1].mappings.every(m=>m.relation==='related'&&m.limitation));
 assert.equal(JSON.stringify(request).includes('fabricated'),false);
 assert.deepEqual(request.directAvoidances,[]);assert.equal(audit.deferred,undefined);
 assert.ok(audit.genrePreference.fantasy>0);
 assert.deepEqual(request.currentIntent.requirements.at(-1).mappings,[]);
 assert.deepEqual(audit.avoidanceKeys,['progression_fatigue']);
 assert.equal(request.ageEligibility,'UNKNOWN');assert.equal(request.applyQualityShadow,false);
 assert.equal(request.signals,undefined);assert.equal(request.filters,undefined);
 for(const requirement of request.currentIntent.requirements) assert.ok(request.sourceText.includes(requirement.quote));
 assert.ok(buildDailyRequest(original,seed,{rows:[],byId:new Map()}).audit.unmapped.length>0,'unknown taxonomy is recorded rather than fabricated');
});
test('only real, identity-checked registrations become ordinary positive evidence and exclusions',()=>{
 const original=input();original.recommendations=[{...work,createdAt:'2026-11-02T00:00:00Z'}];
 const {request}=buildDailyRequest(original,seed,context);
 assert.equal(request.reactionEvents.length,1);assert.equal(request.reactionEvents[0].reaction,'positive');
 assert.deepEqual(request.knownExcludedWorkIds,['work-a']);assert.ok(request.sourceText.includes(request.reactionEvents[0].quote));
 original.recommendations[0].title='같은 ID지만 다른 작품';
 assert.throws(()=>buildDailyRequest(original,seed,context),/IDENTITY_REVIEW/);
});
test('genre and duel answers enter one real soft requirement; registered works use the result page blend exactly once',()=>{
 const original=input();original.answers.genre={murim:'high',fantasy:'low'};
 const murim=buildDailyRequest(original,seed,context).audit.genrePreference;
 assert.ok(genreSupport(murim,{genreScores:{murim:3}},seed)>genreSupport(murim,{genreScores:{fantasy:3}},seed));
 const base=buildTasteSnapshot({seed,answers:original.answers});
 const recommendation={genreScores:{fantasy:3},tagScores:{growth:3}};
 original.snapshotData=base;original.recommendations=[{...work,recommendation,createdAt:'2026-11-02T00:00:00Z'}];
 const actual=buildDailyRequest(original,seed,context);
 assert.deepEqual(actual.audit.genrePreference,applyRecommendationTaste(base,[recommendation],seed).tasteVector.genreScores);
 assert.equal(actual.request.currentIntent.requirements.filter(item=>item.serviceGenrePreference).length,1);
 assert.equal(actual.request.filters,undefined,'preference does not become a hard genre restriction');
 assert.equal(actual.request.reactionEvents.length,1,'registered works are reference evidence, not a second genre blend');
 assert.equal(genreSupport({},recommendation,seed),0);
});
test('scoped genre evaluation restores the verified engine export even after failure',()=>{
 const original=()=>({});const engine={evaluate:original};
 assert.throws(()=>withDailyGenrePreference(engine,seed,()=>{assert.notEqual(engine.evaluate,original);throw Error('stop');}),/stop/);
 assert.equal(engine.evaluate,original);
});
test('old question versions and unknown choices do not silently use current meanings',()=>{
 assert.throws(()=>buildDailyRequest({...input(),questionSetVersion:'old'},seed,context),/VERSION_REVIEW/);
 assert.throws(()=>buildDailyRequest({...input(),answers:{appeal:['unknown']}},seed,context),/UNKNOWN_TEST_CHOICE/);
});
test('cache identity changes immediately for answers or registered works, but not JSON object ordering',()=>{
 const original=input(),time='2026-11-05T01:00:00Z',key=dailySelectionKey(original,seed,time);
 assert.equal(key,dailySelectionKey({...original,answers:{...original.answers}},seed,time));
 assert.notEqual(key,dailySelectionKey({...original,answers:{...original.answers,appeal:['appeal_growth_training']}},seed,time));
 assert.notEqual(key,dailySelectionKey({...original,recommendations:[{canonicalWebtoonId:'work-a'}]},seed,time));
 assert.notEqual(key,dailySelectionKey(original,seed,'2026-11-05T15:00:00Z'));
});
test('same-day requests coalesce; changed input and KST midnight recompute without exposure exclusions',async()=>{
 let calls=0;const seen=[];
 const select=createDailySelector({run:async data=>{calls++;seen.push(data);return {items:[{canonicalWebtoonId:'same-best-work'}]};}});
 const original=input();
 await Promise.all([select(original,seed,'2026-11-05T01:00:00Z'),select(original,seed,'2026-11-05T01:00:00Z')]);assert.equal(calls,1);
 await select(original,seed,'2026-11-05T02:00:00Z');assert.equal(calls,1);
 await select({...original,answers:{appeal:['appeal_growth_training']}},seed,'2026-11-05T02:00:00Z');assert.equal(calls,2);
 const next=await select(original,seed,'2026-11-05T15:00:00Z');assert.equal(calls,3);assert.equal(next.items[0].canonicalWebtoonId,'same-best-work');
 assert.ok(seen.every(data=>!data.exposureHistory&&!data.knownExcludedWorkIds));
});
test('failed computations are not cached as successful or replaced with arbitrary work IDs',async()=>{
 let calls=0;const select=createDailySelector({run:async()=>{calls++;throw Error('fail');}});
 await assert.rejects(()=>select(input(),seed),/fail/);await assert.rejects(()=>select(input(),seed),/fail/);assert.equal(calls,2);
});
test('isolated worker cannot use sample histories, observer, or native commit paths',()=>{
 const worker=fs.readFileSync(new URL('../../scripts/daily-recommendation/runtime-worker.cjs',import.meta.url),'utf8');
 assert.doesNotMatch(worker,/require\([^\n]*(?:run\.cjs|history\.cjs|observer)/);
 assert.match(worker,/pipeline\.cjs/);assert.match(worker,/run\(prepared, context, \[\]\)/);
 assert.doesNotMatch(worker,/writeFile|appendFile|commit-history|commit-exposure/);
});
