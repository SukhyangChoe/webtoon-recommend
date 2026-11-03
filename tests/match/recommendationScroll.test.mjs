import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendationScrollTarget,recommendationTitleMotion,RECOMMENDATION_TITLE_PIXELS_PER_SECOND,RECOMMENDATION_TITLE_START_HOLD_SECONDS,RECOMMENDATION_TITLE_END_HOLD_SECONDS} from '../../src/features/match/config/recommendationPresentation.mjs';
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
test('titles hold 0.5s at the start, travel at 48px/s for any length, then hold exactly 1s',()=>{
 assert.equal(RECOMMENDATION_TITLE_PIXELS_PER_SECOND,48);
 assert.equal(RECOMMENDATION_TITLE_END_HOLD_SECONDS,1);
 assert.equal(RECOMMENDATION_TITLE_START_HOLD_SECONDS,.5);
 for(const travel of [.25,2,8,24,48,240,1500]){
  const motion=recommendationTitleMotion(travel);
  assert.equal(motion.travel,travel);
  assert.equal(motion.travel/motion.moveDuration,48);
  assert.equal(motion.holdDuration,1);
  assert.equal(motion.startHoldDuration,.5);
  assert.ok(Math.abs(motion.duration-motion.moveDuration-1.5)<1e-10);
  assert.ok(Math.abs(motion.moveStartPercent/100*motion.duration-.5)<1e-10);
  assert.ok(Math.abs((motion.moveEndPercent-motion.moveStartPercent)/100*motion.duration-motion.moveDuration)<1e-10);
 }
 assert.deepEqual(recommendationTitleMotion(240),{travel:240,duration:6.5,moveDuration:5,startHoldDuration:.5,holdDuration:1,moveStartPercent:.5/6.5*100,moveEndPercent:5.5/6.5*100});
 for(const value of [0,NaN,Infinity,-20]){
  assert.deepEqual(recommendationTitleMotion(value),{travel:0,duration:1.5,moveDuration:0,startHoldDuration:.5,holdDuration:1,moveStartPercent:1/3*100,moveEndPercent:1/3*100});
 }
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
