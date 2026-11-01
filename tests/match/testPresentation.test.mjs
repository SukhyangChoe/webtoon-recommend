import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TEST_HELP_COPY,DUEL_HELP_COPY} from '../../src/features/match/config/testPresentation.mjs';
const seed=JSON.parse(fs.readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json',import.meta.url)));

test('all six scene choices use the same updated title, progress label and prompt',()=>{
 const questions=seed.questions.filter(question=>question.questionId.startsWith('wm_duel_'));
 assert.equal(questions.length,6);
 assert.equal(seed.sections.find(section=>section.sectionKey==='first_episode_duel').displayLabel,'끌리는 첫 장면');
 questions.forEach((question,index)=>{
  assert.equal(question.title,'끌리는 첫 장면');
  assert.equal(question.progressLabel,`끌리는 첫 장면 ${index+1}/6`);
  assert.equal(question.questionText,'어느 이야기를 먼저 읽고 싶나요?');
 });
});

test('taste and avoidance screens use concise titles',()=>{
 for(const [id,title] of Object.entries({
  wm_positive_02_appeal:'계속 보게 되는 매력',
  wm_positive_03_character_relationship:'끌리는 인물과 관계',
  wm_avoidance_01:'나와 안 맞는 요소',
 }))assert.equal(seed.questions.find(question=>question.questionId===id).title,title);
});

test('every helper-bearing test and recovery has concise noun-style presentation copy',()=>{
 for(const question of seed.questions.filter(q=>q.helperText||q.questionId==='wm_genre_recovery_01')){
  assert.ok(TEST_HELP_COPY[question.questionId],question.questionId);
  assert.doesNotMatch(TEST_HELP_COPY[question.questionId],/주세요|골라줘|돼요|있어요|표시해줘/);
  assert.ok(TEST_HELP_COPY[question.questionId].length<=40);
 }
 assert.equal(DUEL_HELP_COPY,'선호 장면 선택 · 복수 선택 가능');
 assert.match(TEST_HELP_COPY.wm_positive_01_setting,/최대 4개/);
 assert.match(TEST_HELP_COPY.wm_positive_02_appeal,/첫 선택이 대표 취향/);
 assert.match(TEST_HELP_COPY.wm_avoidance_01,/최대 3개/);
});
