import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classify, QUESTIONS, VERSION, DEMO_ANSWERS } from './shared/model.mjs';

const ROOT=dirname(fileURLToPath(import.meta.url));
const scrypt=promisify(scryptCallback);
const hash=value=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(24).toString('base64url');
const DAY=86400000;
const KDF={N:32768,r:8,p:3,maxmem:64*1024*1024};
export function createApp({databasePath=process.env.DATABASE_PATH||resolve(ROOT,'data/atlas.sqlite'),origin=process.env.APP_ORIGIN||'',secureCookies=process.env.COOKIE_SECURE==='true',seed=process.env.SEED_DEMO!=='false'}={}) {
  if(databasePath!==':memory:') mkdirSync(dirname(resolve(databasePath)),{recursive:true});
  const db=new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS results(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,visitor_hash TEXT NOT NULL,answers TEXT NOT NULL,profile TEXT NOT NULL,version TEXT NOT NULL,created_at TEXT NOT NULL,share_token TEXT UNIQUE);
    CREATE INDEX IF NOT EXISTS results_user_date ON results(user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    PRAGMA user_version=1;`);
  if(seed){
    db.prepare('INSERT INTO results VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET answers=excluded.answers,profile=excluded.profile,version=excluded.version').run('demo',null,'seed',JSON.stringify(DEMO_ANSWERS),JSON.stringify(classify(DEMO_ANSWERS)),VERSION,new Date().toISOString(),'demo');
  }
  const rate=new Map();
  let activeKdfs=0;
  const sessionName=secureCookies?'__Host-atlas_session':'atlas_session';
  const visitorName=secureCookies?'__Host-atlas_visitor':'atlas_visitor';
  function limit(key,max=50,windowMs=60000){
    const now=Date.now();let item=rate.get(key);if(!item||item.until<now)item={count:0,until:now+windowMs};item.count++;rate.set(key,item);
    if(rate.size>5000)for(const [k,v]of rate)if(v.until<now)rate.delete(k);
    if(item.count>max)throw Object.assign(new Error('A little too fast. Please wait a minute and try again.'),{status:429});
  }
  async function derive(password,salt){
    if(activeKdfs>=4)throw Object.assign(new Error('Sign-in is busy. Please try again in a moment.'),{status:503});
    activeKdfs++;try{return await scrypt(password,salt,64,KDF);}finally{activeKdfs--;}
  }
  async function passwordHash(password){const salt=randomBytes(16).toString('hex');return `scrypt$32768$8$3$${salt}$${(await derive(password,salt)).toString('hex')}`;}
  async function verify(password,stored){const parts=(stored||`scrypt$32768$8$3$${'00'.repeat(16)}$${'00'.repeat(64)}`).split('$');const actual=await derive(password,parts[4]);const expected=Buffer.from(parts[5],'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)&&!!stored;}
  function cookie(res,name,value,age){const next=`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookies?'; Secure':''}`;res.setHeader('Set-Cookie',[...(res.getHeader('Set-Cookie')||[]),next]);}
  function publicUser(user){return user?{id:user.id,name:user.name,email:user.email}:null;}
  function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  function publicResult(row){return {id:row.id,createdAt:row.created_at,...JSON.parse(row.profile),saved:!!row.user_id,shared:!!row.share_token,shareToken:row.share_token};}
  async function body(req){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>16384)throw Object.assign(new Error('Request is too large.'),{status:413});chunks.push(chunk);}let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(new Error('Send valid JSON.'),{status:400});}if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('Send a JSON object.'),{status:400});return input;}
  function fail(message,status=400){throw Object.assign(new Error(message),{status});}
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
    try{
      const url=new URL(req.url,'http://localhost');const path=url.pathname;
      if(!path.startsWith('/api/')){
        if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'});
        const files={'/app.js':'public/app.js','/styles.css':'public/styles.css','/favicon.svg':'public/favicon.svg','/shared/model.mjs':'shared/model.mjs'};
        const file=files[path]||(path==='/'||/^\/(?:r\/[A-Za-z0-9_-]{3,64}|quiz|history)$/.test(path)?'public/index.html':null);
        if(!file)return send(res,404,{error:'Not found.'});
        const content=readFileSync(resolve(ROOT,file));const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
        res.writeHead(200,{'Content-Type':`${types[extname(file)]}; charset=utf-8`,'Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:content);
      }
      const cookies=Object.fromEntries((req.headers.cookie||'').split(';').filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),x.slice(i+1).trim()];}));
      const session=cookies[sessionName]?db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').get(hash(cookies[sessionName]),Date.now()):null;
      let visitor=cookies[visitorName];if(!visitor||!/^[A-Za-z0-9_-]{32}$/.test(visitor)){visitor=random();cookie(res,visitorName,visitor,365*86400);}
      const visitorHash=hash(visitor);
      limit(`api:${req.socket.remoteAddress}`,120);
      if(!['GET','HEAD'].includes(req.method)){
        if(!req.headers['content-type']?.startsWith('application/json')||req.headers['x-atlas-request']!=='1')fail('This request needs a JSON content type and the app request header.',403);
        if(req.headers['sec-fetch-site']==='cross-site')fail('Cross-site requests are not allowed.',403);
        const expectedOrigin=origin||`${secureCookies?'https':'http'}://${req.headers.host}`;
        if(req.headers.origin&&req.headers.origin!==expectedOrigin)fail('This request came from a different site.',403);
      }
      const owned=row=>row&&(row.user_id?row.user_id===session?.id:row.visitor_hash===visitorHash);
      if(req.method==='GET'&&path==='/api/health')return send(res,200,{ok:true,version:VERSION,questions:QUESTIONS.length});
      if(req.method==='GET'&&path==='/api/me')return send(res,200,{user:publicUser(session)});
      if(req.method==='POST'&&(path==='/api/auth/register'||path==='/api/auth/login')){
        limit(`auth-ip:${req.socket.remoteAddress}`,12,60000);const input=await body(req);
        const email=String(input.email||'').trim().toLowerCase(),password=input.password,name=String(input.name||'').trim();
        if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<10||password.length>128)fail('Use a valid email and a password with 10–128 characters.');
        limit(`auth-email:${email}`,10,60000);
        let user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
        if(path.endsWith('register')){
          if(name.length<1||name.length>40)fail('Choose a player name with 1–40 characters.');
          if(user)fail('That email already has an account. Try signing in.',409);
          const encoded=await passwordHash(password);const id=random();
          try{db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,email,name,encoded,new Date().toISOString());}catch(error){if(error.message.includes('UNIQUE'))fail('That email already has an account. Try signing in.',409);throw error;}
          user=db.prepare('SELECT * FROM users WHERE id=?').get(id);
        }else if(!await verify(password,user?.password))fail('The email or password didn’t match.',401);
        if(cookies[sessionName])db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(cookies[sessionName]));
        db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
        const token=random();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+30*DAY);cookie(res,sessionName,token,30*86400);
        return send(res,200,{user:publicUser(user)});
      }
      if(req.method==='POST'&&path==='/api/auth/logout'){
        if(cookies[sessionName])db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(cookies[sessionName]));cookie(res,sessionName,'',0);return send(res,200,{ok:true});
      }
      if(req.method==='POST'&&path==='/api/results'){
        limit(`results:${visitorHash}`,12,60000);const {answers}=await body(req);let profile;try{profile=classify(answers);}catch(error){fail(error.message);}
        const id=random();db.prepare('INSERT INTO results VALUES(?,?,?,?,?,?,?,NULL)').run(id,session?.id||null,visitorHash,JSON.stringify(answers),JSON.stringify(profile),VERSION,new Date().toISOString());
        return send(res,201,{result:publicResult(db.prepare('SELECT * FROM results WHERE id=?').get(id))});
      }
      if(req.method==='GET'&&path==='/api/history'){
        if(!session)fail('Sign in to open your atlas.',401);
        return send(res,200,{results:db.prepare('SELECT * FROM results WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(session.id).map(publicResult)});
      }
      const resultRoute=path.match(/^\/api\/results\/([A-Za-z0-9_-]{3,64})(?:\/(claim|share))?$/);
      if(resultRoute){
        const [,id,action]=resultRoute;const row=db.prepare('SELECT * FROM results WHERE id=?').get(id);
        if(!owned(row))fail('That result isn’t in your atlas.',404);
        if(req.method==='GET'&&!action)return send(res,200,{result:publicResult(row)});
        if(req.method==='POST'&&action==='claim'){
          if(!session)fail('Sign in to save this result.',401);
          if(!row.user_id)db.prepare('UPDATE results SET user_id=? WHERE id=? AND user_id IS NULL AND visitor_hash=?').run(session.id,id,visitorHash);
          return send(res,200,{result:publicResult(db.prepare('SELECT * FROM results WHERE id=?').get(id))});
        }
        if(req.method==='POST'&&action==='share'){
          const token=row.share_token||random();db.prepare('UPDATE results SET share_token=? WHERE id=?').run(token,id);return send(res,200,{token,url:`/r/${token}`});
        }
        if(req.method==='DELETE'&&action==='share'){db.prepare('UPDATE results SET share_token=NULL WHERE id=?').run(id);return send(res,200,{ok:true});}
        if(req.method==='DELETE'&&!action){db.prepare('DELETE FROM results WHERE id=?').run(id);return send(res,200,{ok:true});}
      }
      const shared=path.match(/^\/api\/share\/([A-Za-z0-9_-]{3,64})$/);
      if(req.method==='GET'&&shared){
        const row=db.prepare('SELECT * FROM results WHERE share_token=?').get(shared[1]);if(!row)fail('This player card is unavailable or its sharing was turned off.',404);
        const profile=JSON.parse(row.profile);return send(res,200,{result:{...profile,createdAt:row.created_at,shared:true,demo:row.id==='demo'}});
      }
      if(req.method==='DELETE'&&path==='/api/account'){
        if(!session)fail('Sign in first.',401);const {password}=await body(req);if(typeof password!=='string'||password.length>128||!await verify(password,session.password))fail('The password didn’t match.',401);
        db.prepare('DELETE FROM users WHERE id=?').run(session.id);cookie(res,sessionName,'',0);return send(res,200,{ok:true});
      }
      return send(res,404,{error:'Not found.'});
    }catch(error){if(!error.status)console.error(error);if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'Something went wrong. Please try again.'});else res.end();}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  server.on('close',()=>db.close());
  return {server,db};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
  const {server}=createApp();server.listen(port,host,()=>console.log(`Player Atlas is ready at http://${host}:${server.address().port}`));
  process.on('SIGINT',()=>server.close(()=>process.exit(0)));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
