import { PAIR_READING_VERSION, PAIR_READING_INTROS, PAIR_READING_SCENES, PAIR_READING_RULES, PAIR_READING_CONTRASTS } from '../config/pairReadingCopy.mjs';
import { READER_FEATURE_COPY } from '../config/readerExplanationCopy.mjs';
import { pairArchetypeFor } from '../share/shareArchetypes.mjs';

const GENRES = ['fantasy','murim','romance','ropan','action','thriller_horror','drama_daily','comedy','sports'];
function choices(value, prefixes) {
  return Array.isArray(value) ? [...new Set(value.filter(key => typeof key === 'string' && Object.hasOwn(READER_FEATURE_COPY,key) && prefixes.some(prefix=>key.startsWith(prefix))))] : [];
}
function directPreferences(snapshot) {
  const answers = snapshot?.answers ?? {};
  const appeal = choices(answers.appeal,['appeal_']);
  const characterRelationship = choices(answers.characterRelationship,['character_','relationship_']);
  const setting = answers.setting?.indifferent ? [] : choices(answers.setting?.selected,['setting_']);
  return { selected:new Set([...appeal,...characterRelationship,...setting]), primary:new Set([appeal[0],characterRelationship[0],setting.includes(answers.setting?.primary)?answers.setting.primary:null].filter(Boolean)), appeal:appeal[0], characterRelationship:characterRelationship[0] };
}
function displayedGenres(snapshot) {
  return [...new Set((Array.isArray(snapshot?.displayGenres)?snapshot.displayGenres:[]).slice(0,3)
    .filter(item=>GENRES.includes(item?.genreKey)&&Number.isFinite(item.stars)&&item.stars>0).map(item=>item.genreKey))];
}

/** Copy selection only. No vectors, scoring changes, randomness, queries, persistence or raw answers in output. */
export function buildPairReading({ ownerSnapshot, challengerSnapshot, score } = {}) {
  const owner=directPreferences(ownerSnapshot),challenger=directPreferences(challengerSnapshot);
  const ownerGenres=displayedGenres(ownerSnapshot),challengerGenres=displayedGenres(challengerSnapshot);
  const sharedGenres=ownerGenres.filter(key=>challengerGenres.includes(key));
  const genreRank=key=>ownerGenres.indexOf(key)+challengerGenres.indexOf(key);
  sharedGenres.sort((a,b)=>genreRank(a)-genreRank(b)||GENRES.indexOf(a)-GENRES.indexOf(b));
  const shared=new Set([...owner.selected].filter(key=>challenger.selected.has(key)));
  const primaryCount=keys=>keys.reduce((count,key)=>count+Number(owner.primary.has(key))+Number(challenger.primary.has(key)),0);
  const rules=PAIR_READING_RULES.flatMap((rule,order)=>{
    if(rule.genre&&!sharedGenres.includes(rule.genre))return [];
    const matched=rule.sharedAny.filter(key=>shared.has(key));
    return matched.length?[{key:rule.key,tier:rule.genre?2:1,primary:primaryCount(matched),genre:rule.genre?genreRank(rule.genre):0,order}]:[];
  });
  rules.sort((a,b)=>b.tier-a.tier||b.primary-a.primary||a.genre-b.genre||a.order-b.order);
  const contrast=PAIR_READING_CONTRASTS.find(rule=>{
    const a=owner[rule.group],b=challenger[rule.group];
    return a!==b&&rule.pair.includes(a)&&rule.pair.includes(b);
  });
  const validScore=typeof score==='number'&&Number.isFinite(score)&&score>=0&&score<=100;
  const archetype=validScore?pairArchetypeFor(score).key:'unknown';
  // Sparse data is not evidence of opposite tastes. Use a neutral scene if nothing is comparable.
  const hasEvidence=sharedGenres.length>0||shared.size>0||Boolean(contrast)||
    (owner.selected.size>0&&challenger.selected.size>0)||(ownerGenres.length>0&&challengerGenres.length>0);
  const sceneKey=rules[0]?.key??contrast?.key??(sharedGenres[0]?`genre_${sharedGenres[0]}`:`fallback_${hasEvidence?archetype:'unknown'}`);
  const copy=PAIR_READING_SCENES[sceneKey];
  return { version:PAIR_READING_VERSION,sceneKey,intro:PAIR_READING_INTROS[hasEvidence?archetype:'unknown'],dialogue:[...copy.dialogue],scene:copy.scene,punchline:copy.punchline };
}
