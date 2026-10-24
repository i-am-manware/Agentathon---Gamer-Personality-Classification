import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';
import { classify, DEMO_ANSWERS } from '../shared/model.mjs';

async function fixture(t,options={}) {
  const app=createApp({databasePath:':memory:',...options});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  const base=`http://127.0.0.1:${app.server.address().port}`;
  t.after(()=>new Promise(resolve=>{if(!app.server.listening)return resolve();app.server.close(resolve);}));
  function client(){const jar=new Map();return async(path,method='GET',data,headers={})=>{
    const response=await fetch(base+path,{method,headers:{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join(';'),...(method==='GET'?{}:{'Content-Type':'application/json','X-Atlas-Request':'1'}),...headers},body:method==='GET'?undefined:JSON.stringify(data??{}),redirect:'manual'});
    for(const cookie of response.headers.getSetCookie()){const [k,v]=cookie.split(';')[0].split('=');if(v)jar.set(k,v);else jar.delete(k);}
    const type=response.headers.get('content-type');return {status:response.status,headers:response.headers,data:type?.includes('application/json')?await response.json():await response.text()};
  };}
  return {...app,base,client};
}
const player={email:'player@example.test',name:'Test Player',password:'a very long test password'};
test('guest journey recomputes scores, protects private results, shares explicitly, and revokes',async t=>{
  const {client}=await fixture(t),a=client(),b=client();
  const submitted=await a('/api/results','POST',{answers:DEMO_ANSWERS,scores:{explorer:0}});assert.equal(submitted.status,201);const r=submitted.data.result;
  assert.deepEqual(r.scores,classify(DEMO_ANSWERS).scores);assert.equal(r.saved,false);assert.equal(r.shareToken,null);
  assert.equal((await a(`/api/results/${r.id}`)).status,200);assert.equal((await b(`/api/results/${r.id}`)).status,404);assert.equal((await a('/api/history')).status,401);
  const shared=await a(`/api/results/${r.id}/share`,'POST');assert.equal(shared.status,200);const token=shared.data.token;
  const publicCard=(await b(`/api/share/${token}`)).data.result;assert.deepEqual(publicCard.scores,r.scores);
  for(const key of ['id','user_id','email','name','answers','visitor_hash','shareToken','password'])assert.equal(key in publicCard,false);
  assert.equal((await b(`/api/results/${r.id}/share`,'POST')).status,404);
  assert.equal((await a(`/api/results/${r.id}/share`,'DELETE')).status,200);assert.equal((await b(`/api/share/${token}`)).status,404);
});
test('optional account claims guest work, persists history, rotates sessions, and enforces ownership',async t=>{
  const {client,db}=await fixture(t),a=client(),b=client();
  const guest=(await a('/api/results','POST',{answers:DEMO_ANSWERS})).data.result;
  const register=await a('/api/auth/register','POST',player);assert.equal(register.status,200);assert.equal(register.data.user.name,player.name);
  assert.ok(register.headers.getSetCookie().some(c=>c.includes('HttpOnly')&&c.includes('SameSite=Strict')));
  assert.equal((await a('/api/history')).data.results.length,0);
  assert.equal((await a(`/api/results/${guest.id}/claim`,'POST')).data.result.saved,true);
  assert.equal((await a('/api/history')).data.results.length,1);
  await b('/api/auth/register','POST',{...player,email:'other@example.test',name:'Other Player'});
  assert.equal((await b(`/api/results/${guest.id}/claim`,'POST')).status,404);assert.equal((await b(`/api/results/${guest.id}`,'DELETE')).status,404);
  await a('/api/auth/logout','POST');assert.equal((await a('/api/me')).data.user,null);assert.equal((await a('/api/history')).status,401);
  assert.equal((await a('/api/auth/login','POST',{...player,password:'incorrect password'})).status,401);
  assert.equal((await a('/api/auth/login','POST',player)).status,200);
  const second=await a('/api/results','POST',{answers:Array(24).fill(2)});assert.equal(second.data.result.saved,true);assert.equal((await a('/api/history')).data.results.length,2);
  assert.equal(db.prepare('SELECT password FROM users WHERE email=?').get(player.email).password.startsWith('scrypt$'),true);
  db.prepare('UPDATE sessions SET expires_at=0 WHERE user_id=?').run(register.data.user.id);assert.equal((await a('/api/me')).data.user,null);assert.equal((await a('/api/history')).status,401);
});
test('account deletion needs the password and cascades results, sessions, and shares',async t=>{
  const {client,db}=await fixture(t),a=client(),b=client();await a('/api/auth/register','POST',player);
  const r=(await a('/api/results','POST',{answers:DEMO_ANSWERS})).data.result;const shared=(await a(`/api/results/${r.id}/share`,'POST')).data;
  assert.equal((await a('/api/account','DELETE',{password:'incorrect password'})).status,401);
  assert.equal((await a('/api/account','DELETE',{password:player.password})).status,200);
  assert.equal((await a('/api/me')).data.user,null);assert.equal((await b(`/api/share/${shared.token}`)).status,404);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
});
test('invalid input, cross-site requests, non-JSON mutations, and traversal are rejected',async t=>{
  const {client,base}=await fixture(t),a=client();
  assert.equal((await a('/api/results','POST',{answers:[1,2]})).status,400);
  assert.equal((await a('/api/results','POST',{answers:Array(24).fill(5)})).status,400);
  assert.equal((await a('/api/results','POST',{answers:DEMO_ANSWERS},{Origin:'https://evil.example'})).status,403);
  assert.equal((await a('/api/results','POST',{answers:DEMO_ANSWERS},{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await a('/api/results','POST',{answers:DEMO_ANSWERS},{'X-Atlas-Request':''})).status,403);
  const nullBody=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Atlas-Request':'1'},body:'null'});assert.equal(nullBody.status,400);
  const oversized=await a('/api/results','POST',{answers:DEMO_ANSWERS,extra:'a'.repeat(17000)});assert.equal(oversized.status,413);
  assert.equal((await a('/%2e%2e/server.mjs')).status,404);assert.equal((await a('/server.mjs')).status,404);
  const root=await a('/');assert.equal(root.status,200);assert.ok(root.data.includes('Player Atlas'));assert.ok(root.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  const sample=await a('/api/share/demo');assert.equal(sample.status,200);assert.equal(sample.data.result.demo,true);
});
test('SQLite results and account history survive a full server restart',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'player-atlas-test-'));
  const databasePath=join(folder,'atlas.sqlite');const first=await fixture(t,{databasePath}),a=first.client();await a('/api/auth/register','POST',player);
  const r=(await a('/api/results','POST',{answers:DEMO_ANSWERS})).data.result;await new Promise(resolve=>first.server.close(resolve));
  const second=await fixture(t,{databasePath}),b=second.client();t.after(()=>rmSync(folder,{recursive:true,force:true}));assert.equal((await b('/api/auth/login','POST',player)).status,200);
  const history=(await b('/api/history')).data.results;assert.equal(history.length,1);assert.equal(history[0].id,r.id);assert.deepEqual(history[0].scores,r.scores);
});
