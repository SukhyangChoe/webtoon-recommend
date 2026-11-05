import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPairReading } from '../../src/features/match/engine/pairReadingEngine.mjs';
import { PAIR_READING_SCENES, PAIR_READING_RULES, PAIR_READING_CONTRASTS, PAIR_READING_INTROS } from '../../src/features/match/config/pairReadingCopy.mjs';
import { buildTasteSnapshot } from '../../src/features/match/engine/resultEngine.mjs';
import { calculateCompatibility } from '../../src/features/match/engine/compatibilityEngine.mjs';
const seed=JSON.parse(fs.readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json',import.meta.url),'utf8'));
const genres=seed.publicGenrePolicy.publicGenres.map(item=>item.genreKey);
function snapshot(genre='action',features=[]){
  const setting=features.filter(key=>key.startsWith('setting_'));
  return {displayGenres:[{genreKey:genre,stars:9}],answers:{appeal:features.filter(key=>key.startsWith('appeal_')),characterRelationship:features.filter(key=>/^(character_|relationship_)/.test(key)),setting:{selected:setting,primary:setting[0],indifferent:!setting.length},avoidance:[]}};
}
test('every original scene is reachable, unique and contains an understandable dialogue and punchline',()=>{
  const reached=new Set();
  const pick=(a,b,score=75)=>{const result=buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score});reached.add(result.sceneKey);return result;};
  for(const rule of PAIR_READING_RULES){
    const s=snapshot(rule.genre??'action',[rule.sharedAny[0]]);
    assert.equal(pick(s,s).sceneKey,rule.key);
    for(const feature of rule.sharedAny)assert.ok(seed.positiveFeatureCatalog.some(item=>item.featureKey===feature));
  }
  for(const rule of PAIR_READING_CONTRASTS){
    assert.equal(pick(snapshot('fantasy',[rule.pair[0]]),snapshot('romance',[rule.pair[1]])).sceneKey,rule.key);
  }
  for(const genre of genres)assert.equal(pick(snapshot(genre),snapshot(genre)).sceneKey,`genre_${genre}`);
  const types=['co_owned_favorites','all_night_binge_mates','recommendation_guarantee','genre_exchange_party','taste_showdown_rivals','opposite_shelf_guide'];
  for(const [index,score]of[95,85,75,60,45,20].entries())assert.equal(pick(snapshot('fantasy',['appeal_action_catharsis']),snapshot('romance',['appeal_emotional_afterglow']),score).sceneKey,`fallback_${types[index]}`);
  assert.equal(pick(null,null).sceneKey,'fallback_unknown');
  assert.deepEqual([...reached].sort(),Object.keys(PAIR_READING_SCENES).sort());
  const paragraphs=Object.values(PAIR_READING_SCENES).map(copy=>copy.scene+' '+copy.punchline);
  assert.equal(new Set(paragraphs).size,paragraphs.length);
  for(const copy of Object.values(PAIR_READING_SCENES)){
    assert.equal(copy.dialogue.length,2);assert.ok(copy.dialogue.every(line=>line.length>=4&&line.length<=45));
    assert.ok(copy.scene.length>=45&&copy.scene.length<=150);assert.ok(copy.punchline.length>=15&&copy.punchline.length<=85);
    assert.doesNotMatch(JSON.stringify(copy),/성공 확률|실패 확률|적중률|\d+%|undefined|null/);
  }
});
test('requires actual shared direct choices, never inferred/blended features or omitted preferences',()=>{
  const a=snapshot('murim',['appeal_growth_training']),b=snapshot('murim',[]);
  b.positiveTasteScores={appeal:{appeal_growth_training:10}};
  b.tasteVector={tagScores:{training:10,growth:10}};b.wellMatchedLabels=['성장'];
  assert.equal(buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score:80}).sceneKey,'genre_murim');
  b.answers.appeal=['appeal_growth_training'];
  assert.equal(buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score:80}).sceneKey,'murim_growth');
  const c=snapshot('murim',['setting_case_mystery']);c.answers.setting.indifferent=true;
  assert.equal(buildPairReading({ownerSnapshot:c,challengerSnapshot:c,score:80}).sceneKey,'genre_murim','indifferent setting does not become a positive choice');
  const sparse={positiveTasteScores:{appeal:{appeal_growth_training:10}},lessMatchedLabels:['感情'],answers:{avoidance:['avoid_repetition']}};
  assert.equal(buildPairReading({ownerSnapshot:sparse,challengerSnapshot:sparse,score:0}).sceneKey,'fallback_unknown','shared dislike alone is not a strong connection');
});
test('contrasts use differing representative choices, not assumptions about unchosen options',()=>{
  const a=snapshot('fantasy',['relationship_slow_build']),b=snapshot('romance',['relationship_direct_chemistry']);
  assert.equal(buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score:50}).sceneKey,'contrast_slow_direct');
  b.answers.characterRelationship=[];
  assert.ok(!buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score:50}).sceneKey.startsWith('contrast_'));
  a.answers.characterRelationship=['character_hidden_power','relationship_slow_build'];b.answers.characterRelationship=['character_overpowered','relationship_direct_chemistry'];
  assert.ok(!buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score:50}).sceneKey.startsWith('contrast_'),'secondary choices do not invent a primary contrast');
});
test('representative shared feature wins ties; same score yields genuinely different scenes',()=>{
  const a=snapshot('action',['appeal_growth_training','relationship_bond']);
  a.answers.characterRelationship.unshift('character_overpowered');
  const result=buildPairReading({ownerSnapshot:a,challengerSnapshot:a,score:75});
  assert.equal(result.sceneKey,'shared_growth','both primary growth choices outrank secondary bond');
  assert.notEqual(result.sceneKey,buildPairReading({ownerSnapshot:snapshot('romance',['relationship_slow_build']),challengerSnapshot:snapshot('romance',['relationship_slow_build']),score:75}).sceneKey);
});
test('all genre pairs and representative feature combinations are symmetric, deterministic, non-mutating and private',()=>{
  const features=seed.positiveFeatureCatalog.map(item=>item.featureKey);
  let count=0;
  for(const ga of genres)for(const gb of genres)for(const feature of features){
    const a={...snapshot(ga,[feature]),anonymousId:'private-owner',privateScores:{secret:123}},b=snapshot(gb,[feature]);
    const before=structuredClone([a,b]);
    const ab=buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score:75});
    assert.deepEqual(ab,buildPairReading({ownerSnapshot:b,challengerSnapshot:a,score:75}));
    assert.deepEqual([a,b],before);
    assert.deepEqual(Object.keys(ab).sort(),['version','sceneKey','intro','dialogue','scene','punchline'].sort());
    assert.doesNotMatch(JSON.stringify(ab),/private-owner|secret|privateScores|anonymousId|answers|tasteVector/);
    count++;
  }
  assert.equal(count,2430);
});
test('invalid score and malformed/missing data stay neutral, not low compatibility',()=>{
  for(const score of [null,undefined,NaN,Infinity,-1,101,'90']){
    const result=buildPairReading({ownerSnapshot:snapshot('fantasy'),challengerSnapshot:snapshot('romance'),score});
    assert.equal(result.sceneKey,'fallback_unknown');assert.equal(result.intro,PAIR_READING_INTROS.unknown);
  }
  for(const value of [null,{}, {answers:{appeal:'appeal_growth_training',characterRelationship:[null,'<script>'],setting:{selected:{},primary:'unknown'}},displayGenres:[null,{genreKey:'invalid',stars:99},{genreKey:'murim',stars:0}]}]){
    assert.equal(buildPairReading({ownerSnapshot:value,challengerSnapshot:value,score:0}).sceneKey,'fallback_unknown');
  }
});
test('reading changes neither compatibility, its inputs nor ranking/scoring persistence',()=>{
  const make=(id,genre,features)=>buildTasteSnapshot({seed,answers:{...snapshot(genre,features).answers,genre:{[genre]:'high'}},profileId:id});
  const a=make('a','murim',['appeal_growth_training']),b=make('b','romance',['relationship_slow_build']);
  const before=structuredClone([a,b]),compatibility=calculateCompatibility(a,b);
  buildPairReading({ownerSnapshot:a,challengerSnapshot:b,score:compatibility.score});
  assert.deepEqual([a,b],before);assert.deepEqual(calculateCompatibility(a,b),compatibility);
  const source=fs.readFileSync(new URL('../../src/features/match/server/challengeStore.ts',import.meta.url),'utf8');
  const publicRead=source.slice(source.indexOf('export async function getPublicPairResult'),source.indexOf('export async function getChallengeRanking'));
  assert.match(publicRead,/pairReading: buildPairReading\(\{ ownerSnapshot, challengerSnapshot, score: result.overallScore \}\)/);
  assert.doesNotMatch(publicRead,/insert into|update public\.|delete from/i,'copy is composed on read without changing stored results');
});
