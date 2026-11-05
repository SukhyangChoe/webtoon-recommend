import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationFitHighlighted as highlighted, RECOMMENDATION_FIT_HIGHLIGHT_DISPLAY_THRESHOLD } from '../../src/features/match/config/recommendationFitHighlight.mjs';
import { recommendationFitDisplayScore as display } from '../../src/features/match/config/recommendationFitDisplay.mjs';

test('highlight follows displayed 70 points, not a raw 70 or the former displayed 75', () => {
  assert.equal(RECOMMENDATION_FIT_HIGHLIGHT_DISPLAY_THRESHOLD,70);
  for(const [raw,expectedDisplay,expected] of [[0,0,false],[.47,69,false],[.483024,69,false],[.483025,70,true],[.49,70,true],[.55,74,true],[.56,75,true],[.6,77,true],[.75,87,true],[1,100,true]]) {
    assert.equal(display(raw),expectedDisplay);assert.equal(highlighted(raw,2),expected);
  }
});

test('badge retains minimum comparison evidence and never highlights invalid scores', () => {
  for(const raw of [null,undefined,NaN,Infinity,-.1,1.1,75,'0.75'])assert.equal(highlighted(raw,2),false);
  for(const axes of [0,1,null,undefined,NaN,'2',1.5])assert.equal(highlighted(1,axes),false);
  assert.equal(highlighted(.56,4),true);
});
