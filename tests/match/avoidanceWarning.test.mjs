import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchedAvoidanceWarnings, readerAvoidanceKeys } from '../../src/features/match/engine/avoidanceEngine.mjs';
import { avoidancePreferredPool, withDailyAvoidancePreference } from '../../src/features/match/server/dailyRecommendation/avoidancePreference.mjs';
import { calculateRecommendationFit } from '../../src/features/match/engine/recommendationFitEngine.mjs';
const seed=JSON.parse(fs.readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json',import.meta.url),'utf8'));
const snapshot={answers:{avoidance:['avoid_repetition']}};
test('all mapped quiz burdens have a public warning label, including low but positive burden',()=>{
 for(const feature of seed.avoidanceFeatureCatalog){
  const keys=feature.webtoonFitCompatibility?.avoidanceTagKeys||[];
  const reader={answers:{avoidance:[feature.featureKey]}};
  const warnings=matchedAvoidanceWarnings(reader,{avoidanceTagScores:Object.fromEntries(keys.map(key=>[key,1]))},seed);
  assert.equal(warnings.length,new Set(keys).size,feature.featureKey);
  assert.ok(warnings.every(item=>Object.keys(item).sort().join(',')==='key,label'));
 }
});
test('only this reader’s explicit choices match; another reader, missing scores, zero, and invalid scores do not warn',()=>{
 const work={avoidanceTagScores:{progression_fatigue:3,graphic_intensity:3}};
 assert.deepEqual(matchedAvoidanceWarnings(snapshot,work,seed),[{key:'progression_fatigue',label:'반복·늘어지는 전개'}]);
 assert.deepEqual(matchedAvoidanceWarnings({answers:{avoidance:['avoid_none']}},work,seed),[]);
 for(const value of [null,{}, {avoidanceTagScores:{progression_fatigue:0}}, {avoidanceTagScores:{progression_fatigue:NaN}}, {avoidanceTagScores:{progression_fatigue:'3'}}]) assert.deepEqual(matchedAvoidanceWarnings(snapshot,value,seed),[]);
 assert.deepEqual(matchedAvoidanceWarnings(null,work,seed),[]);
});
test('original none/empty answers override old blended vectors; old snapshots can retain real vector evidence',()=>{
 const tasteVector={avoidanceTagScores:{progression_fatigue:3}};
 assert.deepEqual(readerAvoidanceKeys({tasteVector},seed),['progression_fatigue']);
 assert.deepEqual(readerAvoidanceKeys({answers:{avoidance:[]},tasteVector},seed),[]);
 assert.deepEqual(readerAvoidanceKeys({answers:{avoidance:['avoid_none']},tasteVector},seed),[]);
});
test('partial/composite mappings expose only observed burden tags, never invent the whole feature or a missing burden',()=>{
 const warnings=matchedAvoidanceWarnings({answers:{avoidance:['avoid_slow_without_payoff','avoid_repetition']}},{avoidanceTagScores:{weak_immersion:2,progression_fatigue:1}},seed);
 assert.deepEqual(warnings.map(item=>item.key),['weak_immersion','progression_fatigue']);
 assert.equal(matchedAvoidanceWarnings({answers:{avoidance:['avoid_calm_healing_daily']}},{avoidanceTagScores:{heavy_tone:3}},seed).length,0);
});
test('a strong warning does not change the existing positive fit score or display thresholds',()=>{
 const user={tagScores:{growth:3},contentAxisScores:{martial_training:3},typeScores:{},artStyleScores:{},avoidanceTagScores:{progression_fatigue:3}};
 const work={tagScores:{growth:3},contentAxisScores:{martial_training:3}};
 assert.deepEqual(calculateRecommendationFit(user,work,seed),calculateRecommendationFit(user,{...work,avoidanceTagScores:{progression_fatigue:3}},seed));
});
const candidate=(id,filter={})=>({canonicalWebtoonId:id,candidateOverallFit:.9,axisFilter:{hardAllowed:true,softActive:false,selectionScore:.9,...filter}});
const context={byId:new Map([['clear',{recommendation:{avoidanceTagScores:{}}}],['match',{recommendation:{avoidanceTagScores:{progression_fatigue:3}}}]])};
test('unmatched alternatives precede matches without changing any raw fit or hard eligibility',()=>{
 const originals=[candidate('match'),candidate('clear')],before=JSON.stringify(originals);
 const result=avoidancePreferredPool(originals,[],context,snapshot,seed);
 assert.equal(result.candidates[0].axisFilter.softTier,1);assert.equal(result.candidates[1].axisFilter.softTier,0);
 assert.equal(result.candidates[0].candidateOverallFit,.9);assert.equal(result.candidates[0].axisFilter.selectionScore,.9);
 assert.equal(JSON.stringify(originals),before,'upstream candidate records remain unchanged');
 const rejected=avoidancePreferredPool([candidate('clear',{hardAllowed:false}),candidate('match')],[],context,snapshot,seed);
 assert.equal(rejected.candidates[0].axisFilter.hardAllowed,false);
});
test('existing soft tiers and fixed core prefixes remain upstream-owned; scarcity retains warnings rather than force fill',()=>{
 const prefix=candidate('match'),clear=candidate('clear',{softActive:true,softTier:1});
 const result=avoidancePreferredPool([prefix,clear],[prefix],context,snapshot,seed);
 assert.equal(result.prefix[0],result.candidates[0]);assert.equal(result.prefix[0].canonicalWebtoonId,'match');
 assert.equal(result.candidates[0].axisFilter.softTier,1);assert.equal(result.candidates[1].axisFilter.softTier,2,'original soft tier precedes the new tie-tier');
 assert.equal(avoidancePreferredPool([prefix],[],context,snapshot,seed).candidates.length,1);
});
test('scoped selector extension preserves options, is a no-op without matches, and restores itself on failure',()=>{
 const original=(items,_evidence,options)=>({items,options});const selector={select:original};
 const items=[candidate('clear')];assert.equal(avoidancePreferredPool(items,[],context,snapshot,seed).candidates,items);
 const result=withDailyAvoidancePreference(selector,context,snapshot,seed,()=>selector.select([candidate('match'),candidate('clear')],[],{max:3,laneForSlot:'keep-lane',quality:true}));
 assert.equal(result.options.laneForSlot,'keep-lane');assert.equal(result.options.quality,true);assert.equal(result.items[1].axisFilter.softTier,0);assert.equal(selector.select,original);
 assert.throws(()=>withDailyAvoidancePreference(selector,context,snapshot,seed,()=>{throw Error('stop');}),/stop/);assert.equal(selector.select,original);
});
