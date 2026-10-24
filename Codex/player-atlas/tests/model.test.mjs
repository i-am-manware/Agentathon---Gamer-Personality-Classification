import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, validateAnswers, QUESTIONS, PAIRS, ARCHETYPES, compareResults } from '../shared/model.mjs';

function answersFor(sums) {
  const remaining=[...sums];
  return QUESTIONS.map(q=>{
    const v=Math.max(-2,Math.min(2,remaining[q.pair]));remaining[q.pair]-=v;
    return 2-v*(q.left===PAIRS[q.pair][0]?1:-1);
  });
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);
test('24 balanced, reversed scenarios cover every opposing pair evenly',()=>{
  assert.equal(QUESTIONS.length,24);
  PAIRS.forEach(([a,b],i)=>{assert.equal(QUESTIONS.filter(q=>q.pair===i&&q.left===a).length,4);assert.equal(QUESTIONS.filter(q=>q.pair===i&&q.left===b).length,4);});
});
test('neutral answers yield six equal affinities and a Free Agent at the origin',()=>{
  const r=classify(Array(24).fill(2));assert.equal(r.title,'The Free Agent');
  for(const value of Object.values(r.scores))assert.equal(value,50);
  close(r.coordinate.x,0);close(r.coordinate.y,0);assert.equal(r.clarity,0);assert.equal(r.decisive,0);
});
test('small signals preserve exact precision and reversal symmetry',()=>{
  const a=classify(answersFor([1,0,0])),b=classify(answersFor([-1,0,0]));
  assert.equal(a.dimensions[0],.0625);assert.equal(b.dimensions[0],-.0625);
  assert.equal(a.scores.explorer,53.125);assert.equal(b.scores.strategist,53.125);
});
test('neutral secondary traits do not invent a hybrid personality',()=>{
  const r=classify(answersFor([4,0,0]));assert.equal(r.title,'The Wayfinder');assert.equal(r.hybrid,false);assert.equal(r.secondaryStrong,false);assert.deepEqual(r.games,ARCHETYPES[0].games);
});
test('a strong Explorer projects toward discovery and completes its pair',()=>{
  const r=classify(answersFor([16,0,0]));assert.equal(r.scores.explorer,100);assert.equal(r.scores.strategist,0);close(r.coordinate.x,0);close(r.coordinate.y,-.5);
});
test('aligned opposing dimensions can reach a hexagon vertex',()=>{
  const r=classify(answersFor([16,16,-16]));close(r.coordinate.x,0);close(r.coordinate.y,-1);
});
test('cancelling strong preferences are Crosscurrents, not neutral profiles',()=>{
  const r=classify(answersFor([16,-16,16]));assert.equal(r.title,'The Crosscurrent');assert.equal(r.clarity,100);assert.equal(r.balanced,false);close(r.coordinate.x,0);close(r.coordinate.y,0);
});
test('inverting any response profile complements scores and negates coordinates',()=>{
  const answers=QUESTIONS.map((q,i)=>i%5),a=classify(answers),b=classify(answers.map(v=>4-v));
  ARCHETYPES.forEach(t=>close(a.scores[t.id]+b.scores[t.id],100));
  a.dimensions.forEach((v,i)=>close(v,-b.dimensions[i]));close(a.coordinate.x,-b.coordinate.x);close(a.coordinate.y,-b.coordinate.y);assert.equal(a.clarity,b.clarity);
});
test('all 35,937 attainable dimension triples remain inside the true hexagon',()=>{
  const root=Math.sqrt(3),eps=1e-12;
  for(let e=-16;e<=16;e++)for(let c=-16;c<=16;c++)for(let k=-16;k<=16;k++){
    const r=classify(answersFor([e,c,k])),{x,y}=r.coordinate;
    assert.ok(Math.abs(x)<=root/2+eps);assert.ok(Math.abs(root*y+x)<=root+eps);assert.ok(Math.abs(root*y-x)<=root+eps);
    PAIRS.forEach(([a,b])=>assert.equal(r.scores[a]+r.scores[b],100));
  }
});
test('contextual preferences and neutral choices retain different evidence',()=>{
  const a=classify(Array(24).fill(2)),b=classify(Array(24).fill(0));assert.equal(a.balanced,true);assert.equal(b.balanced,true);
  assert.equal(a.evidence[0].neutral,8);assert.equal(b.evidence[0].neutral,0);assert.equal(b.evidence[0].contextRange,1);
  assert.notEqual(a.insight,b.insight);
});
test('comparison uses all dimensions and has symmetric 0..100 normalization',()=>{
  const a=classify(answersFor([16,16,16])),b=classify(answersFor([-16,-16,-16]));
  assert.equal(compareResults(a,a).distance,0);assert.equal(compareResults(a,b).distance,100);assert.equal(compareResults(a,b).distance,compareResults(b,a).distance);
  assert.ok(compareResults(classify(answersFor([16,-16,16])),classify(Array(24).fill(2))).distance>0);
});
test('classification is deterministic and malformed or sparse responses are rejected',()=>{
  const a=answersFor([5,-2,8]);assert.deepEqual(classify(a),classify(a));
  for(const value of [null,{},Array(24),Array(23).fill(2),Array(25).fill(2),Array(24).fill(-1),Array(24).fill(5),Array(24).fill(1.5),Array(24).fill(null)])assert.throws(()=>validateAnswers(value));
});
