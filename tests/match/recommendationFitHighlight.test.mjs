import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationFitHighlighted as highlighted, RECOMMENDATION_FIT_HIGHLIGHT_DISPLAY_THRESHOLD } from '../../src/features/match/config/recommendationFitHighlight.mjs';
import { recommendationFitDisplayScore as display } from '../../src/features/match/config/recommendationFitDisplay.mjs';

test('highlight follows displayed 75 points, not raw 75 or the old raw 60', () => {
  assert.equal(RECOMMENDATION_FIT_HIGHLIGHT_DISPLAY_THRESHOLD,75);
  for(const [raw,expectedDisplay,expected] of [[0,0,false],[.55,74,false],[.555024,74,false],[.555025,75,true],[.555026,75,true],[.56,75,true],[.56864,75,true],[.6,77,true],[.75,87,true],[1,100,true]]) {
    assert.equal(display(raw),expectedDisplay);assert.equal(highlighted(raw,2),expected);
  }
});

test('badge retains minimum comparison evidence and never highlights invalid scores', () => {
  for(const raw of [null,undefined,NaN,Infinity,-.1,1.1,75,'0.75'])assert.equal(highlighted(raw,2),false);
  for(const axes of [0,1,null,undefined,NaN,'2',1.5])assert.equal(highlighted(1,axes),false);
  assert.equal(highlighted(.56,4),true);
});
