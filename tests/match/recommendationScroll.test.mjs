import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendationScrollTarget,recommendationTitleMotion} from '../../src/features/match/config/recommendationPresentation.mjs';
import {WORK_RETURN_KEY,readRailOffset,writeRailOffset,readWorkReturn,writeWorkReturn,clearWorkReturn} from '../../src/features/match/storage/workReturnStorage.mjs';

function memory(){const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};}
test('recommendation movement is pixel-based, clamped to the real end, and never rounded to a card',()=>{
 assert.equal(recommendationScrollTarget(37,350,1690,'ArrowRight'),117);
 assert.equal(recommendationScrollTarget(37,350,1690,'ArrowLeft'),0);
 assert.equal(recommendationScrollTarget(117,350,1690,'ArrowLeft'),37);
 assert.equal(recommendationScrollTarget(37,350,1690,'End'),1340);
 assert.equal(recommendationScrollTarget(37,350,1690,'Home'),0);
 assert.equal(recommendationScrollTarget(37,500,320,'End'),0);
});
test('title pans faster in one direction while giving the final characters their full travel',()=>{
 assert.deepEqual(recommendationTitleMotion(240),{travel:240,duration:5});
 assert.deepEqual(recommendationTitleMotion(0),{travel:0,duration:1.2});
 assert.equal(recommendationTitleMotion(NaN).travel,0);
 assert.equal(recommendationTitleMotion(-20).travel,0);
});
test('horizontal persistence preserves fractional pixel offsets and keeps separate recommendation lists independent',()=>{
 const storage=memory();writeRailOffset(storage,'personal:a',73.5);writeRailOffset(storage,'pair:b',240.25);
 assert.equal(readRailOffset(storage,'personal:a'),73.5);assert.equal(readRailOffset(storage,'pair:b'),240.25);
 assert.equal(readRailOffset(storage,'different'),0);
 writeRailOffset(storage,'personal:a',NaN);assert.equal(readRailOffset(storage,'personal:a'),73.5);
 const unavailable={getItem(){throw Error();},setItem(){throw Error();}};
 assert.equal(readRailOffset(unavailable,'a'),0);assert.doesNotThrow(()=>writeRailOffset(unavailable,'a',23));
});
test('detail return stores an exact rail anchor, is tab-local and expires safely',()=>{
 const storage=memory();const snapshot={href:'/match/work/wt_fantasy_001?returnTo=%2Fmatch%2Fresult%2Fme',from:'/match/result/me',railKey:'personal:/match/result/me',offset:170.25,left:73.5};
 writeWorkReturn(storage,snapshot,1000000);
 assert.deepEqual(readWorkReturn(storage,1000001),{...snapshot,at:1000000});
 assert.equal(readWorkReturn(memory(),1000001),null);
 assert.equal(readWorkReturn(storage,999999),null);
 assert.equal(readWorkReturn(storage,1000000+30*60*1000+1),null);
 for(const invalid of [{from:'https://outside.example/'},{href:'javascript:alert(1)'},{left:-1},{left:Infinity},{offset:'40'},{railKey:''}]){
  writeWorkReturn(storage,{...snapshot,...invalid},1000000);assert.equal(readWorkReturn(storage,1000001),null);
 }
 storage.setItem(WORK_RETURN_KEY,'broken');assert.equal(readWorkReturn(storage),null);
 clearWorkReturn(storage);assert.equal(storage.getItem(WORK_RETURN_KEY),null);
});
