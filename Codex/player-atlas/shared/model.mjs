export const VERSION = 'atlas-1';
export const ARCHETYPES = [
  { id:'explorer', name:'Explorer', color:'#d8ff62', angle:-90, verb:'Chase the unknown', motto:'The map is only a suggestion.', description:'You follow curiosity past the quest marker. Hidden paths, strange mechanics, and a world that still has secrets are your kind of reward.', strength:'You spot possibilities the party walks straight past.', stretch:'Try finishing one adventure before opening five new ones.', games:['Outer Wilds','Subnautica','The Legend of Zelda: Breath of the Wild'] },
  { id:'competitor', name:'Competitor', color:'#dca8de', angle:-30, verb:'Raise the ceiling', motto:'One more run. A little better.', description:'You come alive when the stakes rise. A close match, a cleaner run, or a personal best gives your play a purpose.', strength:'You turn setbacks into practice instead of excuses.', stretch:'Give yourself a session where the scoreboard is irrelevant.', games:['Rocket League','Street Fighter 6','Trackmania'] },
  { id:'collector', name:'Collector', color:'#f2b67c', angle:30, verb:'Leave no loose ends', motto:'Yes, I need the last one.', description:'You see a world as a collection of stories worth completing. Your satisfaction lives in the finished set, the perfect inventory, and the corner nobody checked.', strength:'Your patience catches the details everyone else misses.', stretch:'Let one checklist stay unfinished if the fun has moved on.', games:['Stardew Valley','Pokémon','Animal Crossing: New Horizons'] },
  { id:'strategist', name:'Strategist', color:'#8dabdf', angle:90, verb:'Think three moves ahead', motto:'There’s always a better route.', description:'You find delight in understanding a system. A clever build or a beautifully timed plan is every bit as exciting as the victory it makes possible.', strength:'You make a difficult problem feel solvable for the whole team.', stretch:'Take the unoptimized option once. See what surprises you.', games:['Slay the Spire','Into the Breach','Civilization VI'] },
  { id:'socializer', name:'Socializer', color:'#8fd8d2', angle:150, verb:'Make it a good night', motto:'The real loot is the group chat.', description:'The people are part of the game for you. Shared mishaps, a new friend, and the story your squad tells afterward are the moments that stick.', strength:'You make a lobby feel like somewhere people want to return.', stretch:'Protect a little space for the games you love on your own.', games:['It Takes Two','Sea of Thieves','Deep Rock Galactic'] },
  { id:'creator', name:'Creator', color:'#e8d27d', angle:210, verb:'Make it your own', motto:'What if we tried this instead?', description:'You treat game rules as raw materials. Whether you build, customize, mod, or invent a ridiculous challenge, your favorite thing is making something that did not exist before.', strength:'You give familiar games an entirely new life.', stretch:'Share a work in progress before it feels perfectly finished.', games:['Minecraft','Terraria','Super Mario Maker 2'] },
];
export const PAIRS = [['explorer','strategist'],['competitor','socializer'],['collector','creator']];
const q = (pair,left,prompt,a,b) => ({pair,left,prompt,a,b});
export const QUESTIONS = [
  q(0,'explorer','The tutorial is over. The world is yours. What happens next?','Follow that suspicious little path.','Work out a plan before setting off.'),
  q(1,'socializer','Your squad has one more match in them. What makes it a good one?','A ridiculous story for the group chat.','A win we really had to work for.'),
  q(2,'collector','You’ve just beaten the final boss. But there’s still…','A whole checklist with my name on it.','A sandbox for my next weird idea.'),
  q(0,'strategist','A mysterious door needs a key you’ve never seen. You…','Connect the clues and solve the system.','Wander somewhere new. It’ll turn up.'),
  q(1,'competitor','A friend invites you to a game you’ve never played. Your first thought?','How long until I can hold my own?','Great. Another place to hang out.'),
  q(2,'creator','The game gives you a tiny island. Your dream is…','Build something nobody else would.','Find every creature, item, and secret.'),
  q(0,'explorer','Everyone says the dungeon is that way. You notice a waterfall.','There is absolutely a cave behind it.','The dungeon first. We have a mission.'),
  q(1,'socializer','Your teammate makes a spectacularly bad play. You…','Laugh together. That clip is priceless.','Help them fix it for the next round.'),
  q(2,'collector','There’s a cosmetic reward you’ll never actually equip.','Still want it. It completes the set.','I’d rather make my current look unique.'),
  q(0,'strategist','A new boss deletes your whole party in ten seconds.','Study the pattern. Change the build.','Try something unexpected and see.'),
  q(1,'competitor','On a free evening, you’re more drawn to…','A challenge that pushes my limits.','A familiar lobby with good company.'),
  q(2,'creator','You have a free hour in a building game. You spend it…','Making an unnecessarily elaborate thing.','Tracking down the resources I’m missing.'),
  q(0,'explorer','Your quest log is looking a little chaotic. Honestly…','Every detour was worth it.','I’d love to sort this into a good route.'),
  q(1,'socializer','You’re picking a guild. What seals the deal?','These are my kind of people.','These players will make me better.'),
  q(2,'collector','A rare item finally drops after weeks. The best part is…','That empty inventory slot is gone.','Now I can do something wild with it.'),
  q(0,'strategist','A game has an enormous skill tree. You want to…','Find a build where everything clicks.','Test all the interesting branches.'),
  q(1,'competitor','Your favorite moment after a long session?','Realizing I’m better than yesterday.','Remembering something we all laughed at.'),
  q(2,'creator','Someone asks to see your save file. You proudly show…','The thing I built from a silly idea.','The collection I spent ages finishing.'),
  q(0,'explorer','You could erase your memory of one game to replay it. Why?','To feel that first discovery again.','To solve its brilliant systems again.'),
  q(1,'socializer','The game is average, but your friends love it. You…','Can still have a brilliant night.','Wish we’d play something more challenging.'),
  q(2,'collector','An achievement asks you to do something hilariously obscure.','Challenge accepted. It’s on the list.','I’d rather invent my own challenge.'),
  q(0,'strategist','Before a big mission, your natural ritual is…','Check the loadout. Think it through.','Pick something fun. The rest is adventure.'),
  q(1,'competitor','If you had to keep just one memory from gaming…','The comeback nobody thought possible.','The people I met along the way.'),
  q(2,'creator','The credits roll. What makes the game stay with you?','The ways I made it my own.','The world I got to fully complete.'),
].map((item,index)=>({...item,id:index,chapter:Math.floor(index/6)}));
export const CHAPTERS = ['First instincts','With your party','In your element','What stays with you'];
export function validateAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length || Array.from(answers).some(v=>!Number.isInteger(v)||v<0||v>4)) throw new Error('Answer all 24 questions with a choice from 0 to 4.');
}
const round = v => Math.round(v*1000)/1000;
export function classify(answers) {
  validateAnswers(answers);
  const items=PAIRS.map(()=>[]);
  QUESTIONS.forEach((q,i)=>items[q.pair].push(((2-answers[i])/2)*(q.left===PAIRS[q.pair][0]?1:-1)));
  const dimensions=items.map(xs=>xs.reduce((a,b)=>a+b,0)/xs.length);
  const scores={};
  PAIRS.forEach(([a,b],i)=>{scores[a]=round(50+50*dimensions[i]);scores[b]=round(50-50*dimensions[i]);});
  let x=0,y=0;
  PAIRS.forEach(([a],i)=>{const angle=ARCHETYPES.find(t=>t.id===a).angle*Math.PI/180;x+=dimensions[i]*Math.cos(angle)/2;y+=dimensions[i]*Math.sin(angle)/2;});
  const ranking=[...ARCHETYPES].sort((a,b)=>scores[b.id]-scores[a.id]||ARCHETYPES.indexOf(a)-ARCHETYPES.indexOf(b));
  const primary=ranking[0],secondary=ranking[1];
  const strength=dimensions.reduce((s,v)=>s+Math.abs(v),0)/3;
  const crosscurrent=strength>.55&&Math.hypot(x,y)<.2;
  const balanced=Math.max(...dimensions.map(Math.abs))<=.125;
  const secondaryStrong=scores[secondary.id]>=60;
  const hybrid=secondaryStrong&&scores[primary.id]-scores[secondary.id]<=12.5 && !balanced;
  const titles={explorer:'The Wayfinder',competitor:'The Challenger',collector:'The Completionist',strategist:'The Mastermind',socializer:'The Connector',creator:'The Worldbuilder'};
  const hybrids={ 'competitor+explorer':'The Trailblazer','collector+explorer':'The Cartographer','explorer+socializer':'The Party Pathfinder','creator+explorer':'The Worldsmith','competitor+strategist':'The Tactician','collector+strategist':'The Archivist','socializer+strategist':'The Raid Architect','creator+strategist':'The Systems Crafter','collector+competitor':'The Trophy Hunter','competitor+creator':'The Meta Inventor','collector+socializer':'The Guild Keeper','creator+socializer':'The Community Builder' };
  const title=balanced?'The Free Agent':crosscurrent?'The Crosscurrent':hybrid?(hybrids[[primary.id,secondary.id].sort().join('+')]||`${primary.name} × ${secondary.name}`):titles[primary.id];
  const subtitle=balanced?'A little of everything. Entirely yourself.':crosscurrent?'Your strongest instincts pull in different directions.':hybrid?`${primary.verb}. ${secondary.verb}.`:primary.motto;
  const situational=items.some(xs=>xs.reduce((s,v)=>s+Math.abs(v),0)/xs.length>.6);
  const strongMix=ranking.filter(t=>scores[t.id]>=80).map(t=>t.name.toLowerCase());
  const hybridInsights={
    'competitor+explorer':'You chase first discoveries and personal bests with the same energy. Unfamiliar territory is a chance to try something daring and learn faster than the rest.',
    'collector+explorer':'Curiosity gets you off the path; completion gives you a reason to keep searching. You uncover a world one forgotten corner at a time, until every discovery has its place.',
    'explorer+socializer':'A new place gets better when you can drag a friend into it. You find unexpected routes and turn the detours into stories your party tells long after the session ends.',
    'creator+explorer':'You treat a game world as both a mystery and a material. Finding an overlooked corner is satisfying; turning it into something of your own is even better. You bring fresh routes and unexpected solutions to a party.',
    'competitor+strategist':'You love a win you can explain. Watching a plan work under pressure is satisfying, and every defeat gives you another variable to understand. Your strongest move often happens before the match begins.',
    'collector+strategist':'Your ideal save file is complete and beautifully organized. You build sensible routes to elusive rewards, and your patience gives every piece a purpose. You make an enormous goal feel like a series of achievable steps.',
    'socializer+strategist':'You see a plan as something people can accomplish together. You make the next steps clear while keeping the party involved, so a difficult challenge feels shared. People trust you to bring both a strategy and a good atmosphere.',
    'creator+strategist':'You enjoy building things that work in unexpected ways. Understanding the rules gives you raw material for clever contraptions, unusual builds, and elegant solutions. You have fun with both the idea and the engineering.',
    'collector+competitor':'Your shelves have stories behind them. A hard-earned achievement feels best when it marks a conquered challenge and a collection brought closer to completion. You bring persistence to the things other players give up on.',
    'competitor+creator':'You like putting an original idea through a real test. A strange build or homemade strategy gets exciting when it survives competition and pushes what a game can do. Your experiments come with a competitive streak.',
    'collector+socializer':'You remember what the party has done and make sure nobody gets left out. Shared milestones, small traditions, and a steadily growing collection give your group a history. You help a good session become a lasting community.',
    'creator+socializer':'You make things people can enjoy together. A custom world, a ridiculous house rule, or a shared creative project turns a lobby into a place with its own personality. Your favorite creations often have your friends in them.',
  };
  const insight=balanced?(situational?'Your priorities change with the situation. You made strong choices on both sides of the trade-offs rather than sitting on the fence. That flexibility gives you different ways to find a good session: the right people, an interesting challenge, or an idea worth chasing.':'Your answers leave room for all six instincts. You often see the appeal in both sides of a trade-off, so the game and the people you play with can decide what you’re looking for. There’s no single lane you need to stay in.'):crosscurrent?`${primary.description} Your strongest signals are ${strongMix.join(', ')}. Those pulls partially cancel on the map, but your full scores reveal a distinctive mix. A point near the center doesn’t mean you play down the middle.`:`${primary.description} ${secondaryStrong?`Your ${secondary.name.toLowerCase()} side adds another layer: ${secondary.verb.toLowerCase()} matters to you, too.`:'Your other motivations are more evenly matched, leaving room for the game and the moment to decide.'} You’re a mix of motivations, and that mix is what makes your play style yours.`;
  const finalInsight=hybrid&&!crosscurrent?`${hybridInsights[[primary.id,secondary.id].sort().join('+')]} Your challenge is choosing when the current adventure is finished enough to move on.`:insight;
  const decisive=round(answers.filter(v=>v===0||v===4).length/24*100);
  const clarity=round(strength*100);
  const evidence=items.map((xs,i)=>({pair:PAIRS[i],first:xs.filter(v=>v>0).length,second:xs.filter(v=>v<0).length,neutral:xs.filter(v=>v===0).length,contextRange:round(xs.reduce((s,v)=>s+Math.abs(v-dimensions[i]),0)/xs.length)}));
  return {version:VERSION,scores,dimensions,coordinate:{x,y},primary:primary.id,secondary:secondary.id,secondaryStrong,title,subtitle,insight:finalInsight,balanced,crosscurrent,hybrid,clarity,decisive,evidence,strength:balanced?'You adapt your role to what the game and the party need.':primary.strength,stretch:balanced?'Choose one instinct to follow next session, and see how it feels.':primary.stretch,games:balanced?['Outer Wilds','It Takes Two','Minecraft']:secondaryStrong?[...new Set([primary.games[0],secondary.games[0],primary.games[1]])]:primary.games};
}
export function compareResults(a,b) {
  const shifts=ARCHETYPES.map(t=>({id:t.id,name:t.name,delta:round(a.scores[t.id]-b.scores[t.id])}));
  const distance=round(Math.sqrt(a.dimensions.reduce((s,v,i)=>s+(v-b.dimensions[i])**2,0)/3)*50);
  return {distance,shifts,largest:[...shifts].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0]};
}
export const DEMO_ANSWERS = QUESTIONS.map(q=>{const pairValue=[1,-.25,-.75][q.pair];return Math.max(0,Math.min(4,Math.round(2-2*pairValue*(q.left===PAIRS[q.pair][0]?1:-1))));});
