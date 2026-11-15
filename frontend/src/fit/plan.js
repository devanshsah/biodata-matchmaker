/* The plan: schedule, workouts, meals, prep and study blocks. Your saved changes (overrides) are applied on top. */

/* ---------- calendar: plan runs Mon 16 Nov 2026 – Sun 16 May 2027 (26 weeks).
   Checkpoints: −3 kg by 31 Dec · −15 kg + beach body by Wed 10 Mar · offer by 27 Feb · birthday 27 Mar.
   The two weeks before (from Mon 2 Nov) are a warm-up: same schedule, light weights. ---------- */
const START=new Date(2026,10,16), WEEKS=26, DAY=864e5;
const GOALS={yearEnd:{date:'2026-12-31',kg:3,label:'−3 kg by 31 Dec'},beach:{date:'2027-03-10',kg:15,label:'−15 kg + beach body by 10 Mar'},offer:'2027-02-27',birthday:'2027-03-27'};
const WARMUP_START=new Date(2026,10,2);
const KEYS=['mon','tue','wed','thu','fri','sat','sun'];
const NAME={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
const SHORT={mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'};

function ist(){ // current date + minutes in India time, whatever the phone's zone
  const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);
  return {date:new Date(+p.year,+p.month-1,+p.day),min:(+p.hour)*60+(+p.minute)};
}
const keyOf=d=>KEYS[(d.getDay()+6)%7];
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const weekOf=d=>Math.floor((d-START+3600e3)/(7*DAY))+1;
const fmtT=m=>{let h=Math.floor(m/60),mm=m%60,ap=h>=12?'pm':'am';h=h%12||12;return h+':'+String(mm).padStart(2,'0')+' '+ap};
const fmtD=d=>d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});

/* ---------- phases ---------- */
const WARMUP={from:-99,to:0,name:'Warm-up',walk:'30 min',note:'The plan officially starts Mon 16 Nov. Use these days to learn the moves with light weights and lock in the routine.'};
const PHASES=[
  {from:1,to:4,name:'Reset',walk:'35 min',scheme:'base',note:'Break the old patterns. Learn every move, stop 2–3 reps short, write your weights down. Fix sleep, kill the night munching, de-bloat. 8k steps a day.'},
  {from:5,to:9,name:'Cut',walk:'45 min',scheme:'volume',note:'Main fat-loss push. First two lifts get a 4th set. Add a rep or the smallest weight jump each session. 10k steps. Dinner: 1 roti or ½ cup rice, not both. Target −3 kg by 31 Dec.'},
  {from:10,to:10,name:'Deload',walk:'45 min',scheme:'deload',note:'Light gym week: 2 sets at ~70% of your weights, food stays tight. Fri 22 Jan: evening body scan.'},
  {from:11,to:17,name:'Shred',walk:'50 min',scheme:'strength',note:'Beach-body block. First two lifts go heavy: 4 × 6–8, everything else as written. 12k steps, dinners light, zero liquid calories. Checkpoint Wed 10 Mar: −15 kg.'},
  {from:18,to:19,name:'Birthday',walk:'45 min',scheme:'strength',note:'Hold the result. Eat at a small deficit, keep lifting heavy. 27 Mar is yours: photos, scan, celebrate.'},
  {from:20,to:20,name:'Deload',walk:'40 min',scheme:'deload',note:'Light week to reset joints and the back before the strength block.'},
  {from:21,to:26,name:'Pro',walk:'40 min',scheme:'strength',note:'Recomp + strength. Eat near maintenance, chase personal records on the main lifts, keep every habit you built. Final scan 14 May.'}
];
const phaseOf=w=>w<=0?WARMUP:(PHASES.find(p=>w>=p.from&&w<=p.to)||PHASES[PHASES.length-1]);

/* ---------- training ---------- */
const WARM={kind:'routine',name:'Warm-up',sr:'7 min',sets:1,cue:'3 min easy bike → bird dog 6/side → glute bridge ×10 → gentle cat-camel ×6 → 1 light set of the first exercise.'};
const GYM={
  mon:{title:'Legs',ex:[WARM,
    {name:'Leg press',sr:'3 × 10–12',sets:3,rest:'90 s',cue:'Feet shoulder-width. Stop before your hips curl off the seat.'},
    {name:'Goblet squat to a bench',sr:'3 × 10',sets:3,rest:'90 s',cue:'Light dumbbell at chest, chest tall, sit back to the bench.'},
    {name:'Leg extension',sr:'3 × 12–15',sets:3,rest:'60 s',cue:'Squeeze 1 s at the top, 2 s down.'},
    {name:'Lying leg curl',sr:'3 × 12–15',sets:3,rest:'60 s',cue:'Hips pressed into the pad. No jerking.'},
    {name:'Side-lying leg raise',sr:'2 × 15 / side',sets:2,rest:'45 s',cue:'Glute medius. Toes slightly down, slow.'},
    {name:'Seated calf raise',sr:'3 × 15',sets:3,rest:'45 s',cue:'Full stretch at the bottom, pause at the top.'},
    {kind:'cardio',name:'Incline walk',sr:'15 min',sets:1,cue:'Talking pace, ~115–135 bpm. Don’t hold the rails.'}]},
  wed:{title:'Upper body A',ex:[WARM,
    {name:'Machine chest press',sr:'3 × 8–12',sets:3,rest:'2 min',cue:'Feet flat, back on the pad, 2 s down.'},
    {name:'Lat pulldown',sr:'3 × 8–12',sets:3,rest:'90 s',cue:'Pull to upper chest, elbows down. Don’t lean far back.'},
    {name:'Seated cable row',sr:'3 × 10–12',sets:3,rest:'90 s',cue:'Sit tall, squeeze shoulder blades. No rocking.'},
    {name:'Seated dumbbell press',sr:'3 × 8–12',sets:3,rest:'90 s',cue:'Bench upright, back against it, ribs down.'},
    {name:'Face pull',sr:'3 × 12–15',sets:3,rest:'60 s',cue:'Rope to forehead, elbows high. Posture fixer.'},
    {name:'Rope pushdown',sr:'2 × 12–15',sets:2,rest:'60 s',cue:'Elbows pinned to your sides.'},
    {name:'Cable biceps curl',sr:'2 × 12–15',sets:2,rest:'60 s',cue:'No swinging.'},
    {kind:'cardio',name:'Bike, easy',sr:'15 min',sets:1,cue:'Talking pace.'}]},
  fri:{title:'Glutes + hamstrings',ex:[WARM,
    {name:'Hip thrust',sr:'3 × 10–12',sets:3,rest:'90 s',cue:'Chin tucked, ribs down, squeeze 1 s at top. Don’t arch.'},
    {name:'Seated leg curl',sr:'3 × 12',sets:3,rest:'60 s',cue:'Slow on the way back.'},
    {name:'Split squat holding a rail',sr:'3 × 10 / leg',sets:3,rest:'60 s',cue:'Short stance, torso upright, back knee down gently.'},
    {name:'Cable kickback',sr:'2 × 12 / side',sets:2,rest:'45 s',cue:'Kick back with the glute, not the lower back.'},
    {name:'Low step-ups',sr:'2 × 10 / leg',sets:2,rest:'60 s',cue:'Knee-height box or lower. Push through the heel.'},
    {name:'Pallof press',sr:'3 × 10 / side',sets:3,rest:'30 s',cue:'Cable at chest height. Resist the twist.'},
    {kind:'cardio',name:'Bike intervals',sr:'10 min',sets:1,cue:'30 s fast / 60 s easy, then easy. Back straight.'}]},
  sat:{title:'Upper body B',ex:[WARM,
    {name:'Dumbbell bench press',sr:'3 × 8–12',sets:3,rest:'2 min',cue:'Feet flat, shoulder blades pinched.'},
    {name:'Single-arm cable pulldown',sr:'3 × 10–12 / side',sets:3,rest:'60 s',cue:'Elbow to hip.'},
    {name:'Chest-supported row',sr:'3 × 10–12',sets:3,rest:'90 s',cue:'Chest on the pad: zero back load.'},
    {name:'Lateral raise',sr:'3 × 12–15',sets:3,rest:'60 s',cue:'Light. Elbows lead to shoulder height.'},
    {name:'Face pull',sr:'3 × 15',sets:3,rest:'60 s',cue:'Elbows high.'},
    {name:'Push-ups',sr:'2 × stop 2 short',sets:2,rest:'60 s',cue:'Knees or incline is fine. Body straight.'},
    {name:'Overhead cable triceps',sr:'2 × 12–15',sets:2,rest:'60 s',cue:'Ribs down, don’t arch.'},
    {kind:'cardio',name:'Incline walk',sr:'20 min',sets:1,cue:'Talking pace.'}]}
};
function exFor(k,ph){
  return GYM[k].ex.map((e,i)=>{
    if(e.kind) {const x={...e}; if((ph.scheme==='volume'||ph.scheme==='strength')&&e.name==='Bike intervals'){x.sr='12 min'} return x;}
    let sets=e.sets, tail=e.sr.split('×')[1];
    const main=i===1||i===2; // the first two lifts after the warm-up are the ones that progress
    if(ph.scheme==='volume'&&main) sets=e.sets+1;
    if(ph.scheme==='strength'&&main&&!/side|\/ /.test(tail)){sets=4;tail=' 6–8';}
    if(ph.scheme==='deload') sets=Math.min(2,e.sets);
    return {...e,sets,sr:sets+' ×'+tail,main};
  });
}
/* ---------- career: full-stack + AI, phased toward an offer by 27 Feb ---------- */
const CAREER=[
  {from:-99,to:4,key:'found',name:'Foundations + positioning'},
  {from:5,to:10,key:'depth',name:'Depth + start applying'},
  {from:11,to:15,key:'interview',name:'Interview season'},
  {from:16,to:19,key:'notice',name:'Close the switch'},
  {from:20,to:99,key:'pro',name:'Go pro'}
];
const careerOf=w=>CAREER.find(c=>w>=c.from&&w<=c.to);
const CURR={
  found:{
    am:{mon:'DSA · core patterns',tue:'DSA · core patterns',wed:'DSA · core patterns',thu:'DSA · core patterns',fri:'DSA · core patterns',sat:'Resume + LinkedIn',sun:'DSA weekly review'},
    pm:{mon:'System design basics',tue:'React + TypeScript',wed:'Spring Boot deep-dive',thu:'AI engineering 101',fri:'Portfolio: Devansh’s Page case study',sat:'Target companies + referral list',sun:'Portfolio project'}},
  depth:{
    am:{mon:'DSA · trees, graphs, heaps, DP',tue:'DSA · trees, graphs, heaps, DP',wed:'DSA · trees, graphs, heaps, DP',thu:'DSA · trees, graphs, heaps, DP',fri:'DSA · trees, graphs, heaps, DP',sat:'Mock interview + revision',sun:'DSA weekly review'},
    pm:{mon:'System design · payments',tue:'Next.js + frontend testing',wed:'Data + infra: Postgres, Redis, Kafka, Docker',thu:'AI · RAG with embeddings',fri:'Build: ship an AI feature',sat:'Applications + referrals',sun:'Portfolio project'}},
  interview:{
    am:{mon:'DSA · timed mixed sets',tue:'DSA · timed mixed sets',wed:'DSA · timed mixed sets',thu:'DSA · timed mixed sets',fri:'DSA · timed mixed sets',sat:'Mock interviews ×2',sun:'DSA review + weak topics'},
    pm:{mon:'System design mock',tue:'LLD in Java',wed:'Backend revision',thu:'AI · agents, tool use + evals',fri:'Behavioural + company prep',sat:'Applications + follow-ups',sun:'Offer prep + negotiation'}},
  notice:{
    am:{mon:'Cloud: GCP/AWS core',tue:'Kubernetes + CI/CD',wed:'AI engineering project',thu:'Frontend performance + accessibility',fri:'Tech writing',sat:'Open source PR',sun:'Weekly reflection'},
    pm:{}},
  pro:{
    am:{mon:'New role: codebase + domain',tue:'System design at scale',wed:'AI engineering: LLMOps + fine-tuning basics',thu:'Full-stack side project',fri:'Tech writing / talk',sat:'Open source PR',sun:'Weekly reflection'},
    pm:{}}
};
const HOW={
  'DSA · core patterns':'Arrays + hashing, two pointers, sliding window, binary search, stacks. 2 problems, 30 min each, then read the best solution and redo it from memory.',
  'DSA · trees, graphs, heaps, DP':'One topic a week: trees → graphs (BFS/DFS, topo sort) → heaps → 1-D DP → 2-D DP. 2 mediums a session.',
  'DSA · timed mixed sets':'2 random mediums in 45 min, talking out loud like the interview. Log every miss.',
  'DSA weekly review':'Redo the 5 hardest problems of the week from scratch.',
  'DSA review + weak topics':'Redo every logged miss of the week. Pick your weakest topic for next week.',
  'Resume + LinkedIn':'Resume v1 by Sun 6 Dec: impact + numbers from mPoint (re-auth API, decline codes). LinkedIn headline: Backend engineer · Java/Spring · Payments · full-stack + AI.',
  'Mock interview + revision':'One timed mock (peer or Pramp-style), then redo every question you missed.',
  'Mock interviews ×2':'One DSA mock + one system design mock. Record yourself; fix one habit each week.',
  'System design basics':'Load balancers, caching, DB indexes + replication, queues, consistency. One classic per week: URL shortener → rate limiter → notification system → chat.',
  'System design · payments':'Your edge. Idempotency keys, retries + backoff, ledgers, reconciliation, webhooks, PCI basics. Design a payment gateway, then a wallet.',
  'System design mock':'45-min mock out loud: requirements → API → data model → scale → trade-offs. Review against a reference design.',
  'React + TypeScript':'Hooks, state, TanStack Query/Router, forms, TypeScript generics. Rebuild one screen of Devansh’s Page from scratch.',
  'Next.js + frontend testing':'App Router, server components, data fetching, auth. Vitest + Testing Library on one real component.',
  'Spring Boot deep-dive':'Transactions, JPA vs JDBC, Spring Security, validation, testing with JUnit 5 + Testcontainers.',
  'Data + infra: Postgres, Redis, Kafka, Docker':'EXPLAIN plans + indexes, caching patterns in Redis, a Kafka producer/consumer, multi-stage Dockerfiles.',
  'Backend revision':'Concurrency + JVM/GC, microservices patterns, Kubernetes basics, security (OAuth2/JWT), observability.',
  'LLD in Java':'SOLID + patterns (strategy, factory, observer, builder). Design one: parking lot, Splitwise, BookMyShow, rate limiter.',
  'AI engineering 101':'How LLMs work (tokens, context, temperature), prompting, structured JSON output, calling the Claude/OpenAI APIs from Java and TypeScript.',
  'AI · RAG with embeddings':'Embeddings, chunking, pgvector in Postgres, retrieval quality. Build “ask my notes” with Spring AI or LangChain4j.',
  'Build: ship an AI feature':'Ship one AI feature end-to-end into Devansh’s Page (e.g. a plan coach that answers from your data). Deployed, not a notebook.',
  'AI · agents, tool use + evals':'Function/tool calling, agents, MCP servers, guardrails, evaluating LLM output. Prepare a 2-min story about your AI feature.',
  'AI engineering project':'Extend your AI feature: evals, cost tracking, streaming UI.',
  'AI engineering: LLMOps + fine-tuning basics':'Prompt/version management, eval sets, monitoring, when fine-tuning beats RAG.',
  'Portfolio: Devansh’s Page case study':'README with architecture diagram, a 1-page case study (Spring Boot + React + Postgres on Cloud Run at $0), then a LinkedIn post.',
  'Portfolio project':'Commit something every session. Small, finished, deployed beats big and half-done.',
  'Target companies + referral list':'List 30 target companies (fintech/payments first), find 2 people at each to ask for referrals.',
  'Applications + referrals':'8 applications a week, 3 referral asks. Log them on the Body tab.',
  'Applications + follow-ups':'New applications + follow up on every one older than a week. Log interviews.',
  'Behavioural + company prep':'6 STAR stories from mPoint (re-auth API is the lead). Research this week’s companies, prepare 3 questions each.',
  'Offer prep + negotiation':'Salary research, compare offers on total comp, write your negotiation script.',
  'Cloud: GCP/AWS core':'IAM, networking basics, Cloud Run/Lambda, managed databases. Deploy one thing.',
  'Kubernetes + CI/CD':'Pods, deployments, services, Helm basics, GitHub Actions pipelines.',
  'Frontend performance + accessibility':'Core Web Vitals, bundle size, lazy loading, keyboard + screen-reader checks.',
  'Tech writing':'One blog post every two weeks about something you built or learned.',
  'Open source PR':'One small PR to a library you use (docs count). Consistency over size.',
  'Weekly reflection':'What you learned, what to drop, next week’s single focus.',
  'New role: codebase + domain':'Your 30-60-90 plan: read code, ship small, learn the domain, meet people.',
  'System design at scale':'Read one real-world architecture write-up a week; redraw it from memory.',
  'Full-stack side project':'One evening project end-to-end in the stack you want to be known for.',
  'Tech writing / talk':'Turn what you built into a post or a 10-min internal talk.'
};
// Your saved changes win; otherwise the topic comes from the career phase of that day.
const STUDY={am:{},pm:{},how:{...HOW}};
function studyFor(d){
  const k=keyOf(d), c=careerOf(weekOf(d)), cur=CURR[c.key];
  const am=STUDY.am[k]||cur.am[k], pm=cur.pm[k]?(STUDY.pm[k]||cur.pm[k]):null;
  return {career:c, am, pm, amHow:STUDY.how[am]||'', pmHow:pm?(STUDY.how[pm]||''):'' , light:!cur.pm[k]};
}
const FOCUS={mon:'Legs',tue:'Dance',wed:'Upper',thu:'Dance',fri:'Glutes',sat:'Upper',sun:'Free'};
const DANCE=['tue','thu'], AM_GYM=[];

/* ---------- meals (Jain, no oats, no soya) ---------- */
// night = prep the evening BEFORE; morn = cooking at 7:45 am same day
const MENU={
  mon:{
    b:{n:'2 besan chilla + bowl of curd',p:18,how:'80 g besan + water + ajwain + green chilli + salt + coriander. Cook 2 thin chillas with ½ tsp oil.'},
    l:{n:'2 roti + thick moong dal + lauki sabzi + curd + salad',p:20,how:'Dal from Sunday’s batch. Lauki: jeera, hing, turmeric, 10 min.',morn:'Make lauki sabzi + 2 roti, pack with Sunday dal and curd.'},
    s:{n:'Hung curd bowl + cucumber + chaat masala',p:8,how:'150 g hung curd, chopped cucumber, chaat masala, chilli flakes.'},
    d:{n:'Palak paneer (100 g paneer) + 1 roti',p:24,how:'Blanch 2 bunches palak 2 min, cold water, blend with 1 green chilli + 1 tomato. Jeera + hing in 1 tsp ghee, add purée, salt, garam masala, simmer 5 min, add paneer cubes. Cooked greens at night: easy on the gut.',night:'Wash and blanch palak for tomorrow, purée, fridge.'}},
  tue:{
    b:{n:'2 moong dal chilla + hung curd dip',p:16,how:'Grind soaked dal with green chilli, jeera, salt. 2 chillas. Dip: hung curd + mint + chaat masala.',night:'Soak ½ cup yellow moong dal (tomorrow’s breakfast chilla).'},
    l:{n:'1 cup rice + rajma + cucumber raita + salad',p:15,how:'Rajma in tomato gravy with Jain spices.',night:'Soak ¾ cup rajma (tomorrow’s lunch).',morn:'Pressure-cook the soaked rajma (6–7 whistles) while you eat; make rice and raita; pack.'},
    s:{n:'30 g roasted chana',p:6,how:'From the packet into a small bowl, not straight from the packet.'},
    d:{n:'Broccoli-mushroom-paneer stir-fry (75 g paneer) + moong soup',p:26,how:'1 tsp oil, jeera, chilli flakes. Broccoli florets 3 min, sliced mushroom + capsicum 3 min, paneer cubes, black pepper, salt, lemon. No soy sauce (no soya). Soup: ¼ cup moong dal, 2 whistles, jeera tadka. Skip mushroom if you keep it Jain.'}},
  wed:{
    b:{n:'Matar poha with peanuts + bowl of curd',p:13,how:'Rinse poha. Temper mustard seeds, curry leaves, peanuts, turmeric, chilli, add ½ cup fresh winter matar for 3 min. Lemon on top.'},
    l:{n:'2 roti + Jain chana masala + curd + salad',p:18,how:'Tomato-based masala, no onion or garlic.',night:'Soak ½ cup kabuli chana (tomorrow’s lunch).',morn:'Pressure-cook soaked chana (5–6 whistles), make masala and 2 roti, pack.'},
    s:{n:'Chaas with jeera + 1 fruit',p:6,how:'1 glass buttermilk, roasted jeera, black salt.'},
    d:{n:'Matar paneer (100 g paneer) + 1 roti + methi raita',p:28,how:'Tomato-green chilli purée, jeera, hing, haldi, kasuri methi. Add ½ cup matar + paneer, simmer 5 min. Raita: curd + finely chopped fresh methi sautéed 1 min + roasted jeera.'}},
  thu:{
    b:{n:'2 besan chilla + bowl of curd',p:18,how:'Same as Monday. Stuff with 30 g grated paneer for +5 g protein.'},
    l:{n:'2 palak moong dal chilla + hung curd dip + sabzi',p:18,how:'Grind soaked dal with a handful of palak, green chilli, jeera. Make chillas, quick sabzi.',night:'Soak ½ cup yellow moong dal + hang 250 g curd in a muslin cloth (tomorrow’s lunch).',morn:'Grind dal, make 2 chillas + quick sabzi, pack with the hung curd dip.'},
    s:{n:'30 g roasted chana + chaas',p:8,how:'Small bowl of chana, 1 glass buttermilk with jeera.'},
    d:{n:'Thick mixed dal + 1 roti + methi-matar sabzi + raita',p:18,how:'Mixed dal, 3 whistles. Sabzi: jeera, hing, chopped fresh methi + ½ cup matar, 6–7 min, pinch of sugar to cut the bitterness.'}},
  fri:{
    b:{n:'Pesarattu + chutney + 10 almonds',p:16,how:'Grind soaked whole moong with green chilli, jeera, salt. Spread thin on tawa.',night:'Soak ½ cup whole green moong (tomorrow’s pesarattu).'},
    l:{n:'2 roti + mixed dal + 75 g paneer bhurji + salad',p:24,how:'Paneer bhurji with tomato and capsicum.',morn:'Cook mixed dal (3 whistles), make paneer bhurji, 2 roti, pack.'},
    s:{n:'Roasted makhana + chaas',p:6,how:'1 cup makhana dry-roasted with a pinch of salt and pepper.'},
    d:{n:'Whole-wheat pasta with broccoli + mushroom in hung-curd sauce',p:19,how:'60 g dry pasta. Sauté broccoli, mushroom, capsicum, tomato with chilli flakes + oregano. Off the heat, stir in hung curd + 1 tbsp grated paneer. Skip mushroom if you keep it Jain.',night:'Hang 250 g curd (tomorrow’s pasta sauce).'}},
  sat:{
    b:{n:'Moong dal chilla + curd + 10 almonds',p:18,how:'Grind soaked dal with green chilli, jeera, salt. Shake comes after the gym today.',night:'Soak ½ cup yellow moong dal (tomorrow’s breakfast).'},
    l:{n:'Moong dal khichdi + curd + salad',p:16,how:'½ cup rice + ¼ cup moong dal, 3 whistles, ghee tadka (1 tsp).'},
    s:{n:'Fruit + bowl of curd',p:7,how:'Any seasonal fruit.'},
    d:{n:'Palak pesto pasta (60 g) + 50 g paneer',p:20,how:'Blend blanched palak + basil (optional) + 10 almonds + 1 tsp olive oil + green chilli + lemon + salt. Toss with whole-wheat pasta and pan-seared paneer.'}},
  sun:{
    b:{n:'Jain poha with peanuts + curd + 1 scoop whey shake',p:37,how:'Weekend: the shake goes with breakfast.'},
    l:{n:'Palak dal + rice + raita',p:17,how:'Use part of today’s batch dal, stir in chopped palak for 3 min. Jeera-hing tadka.'},
    s:{n:'30 g roasted chana + 1 amla',p:6,how:'Small bowl. Amla: winter vitamin C, good for hair and skin.'},
    d:{n:'Paneer tikka (100 g) + grilled broccoli + capsicum + 1 roti',p:24,how:'Marinate paneer, broccoli and capsicum in curd + spices, pan-sear or air-fry 8–10 min.'}}
};
/* ---------- editable plan: defaults + your saved changes ---------- */
const clone=o=>JSON.parse(JSON.stringify(o));
const DEF={menu:clone(MENU),study:{am:{},pm:{},how:clone(HOW)},gym:Object.fromEntries(Object.entries(GYM).map(([k,g])=>[k,g.ex.filter(e=>e!==WARM).map(e=>({name:e.name,kind:e.kind||'',sets:e.sets,reps:e.kind?e.sr:e.sr.split('×')[1].trim(),rest:e.rest||'',cue:e.cue}))]))};
let OVR={menu:{},study:{am:{},pm:{},how:{}},gym:{},log:[]};
function applyOVR(){
  KEYS.forEach(k=>{['b','l','s','d'].forEach(m=>{MENU[k][m]=Object.assign(clone(DEF.menu[k][m]),(OVR.menu[k]||{})[m]||{})})});
  ['am','pm'].forEach(t=>KEYS.forEach(k=>{STUDY[t][k]=(OVR.study[t]||{})[k]||null}));
  STUDY.how=Object.assign(clone(DEF.study.how),OVR.study.how||{});
  Object.keys(GYM).forEach(k=>{const list=OVR.gym[k]||DEF.gym[k];GYM[k].ex=[WARM,...list.map(e=>({name:e.name,kind:e.kind||undefined,sets:e.kind?1:Math.max(1,+e.sets||1),sr:e.kind?e.reps:(Math.max(1,+e.sets||1)+' × '+e.reps),rest:e.rest,cue:e.cue}))]});
}
const SHAKE={n:'1 scoop The Whole Truth whey in water',p:24,how:'Within 30 min after the gym, in 250 ml water. Bloating after it? Try their isolate (less lactose).'};
const SCANS=['2026-11-16','2026-12-11','2026-12-26','2027-01-22','2027-02-26','2027-03-10','2027-03-26','2027-05-14'];
const ONCE={
  '2026-11-21':{id:'blood',m:455,title:'Blood test (fasting)',d:'Before breakfast. CBC, ferritin, vitamin D, B12, TSH, HbA1c, lipid profile. Book a home collection.'},
  '2026-11-28':{id:'derm',m:660,title:'Dermatologist visit',d:'Hairline + skin. Ask about hair-loss treatment options and a retinoid. Take your blood report.'},
  '2026-12-06':{id:'resume',m:1080,title:'Resume v1 due',d:'Numbers from mPoint, full-stack + AI skills, link to Devansh’s Page case study.'},
  '2026-12-28':{id:'apply',m:1288,title:'Applications open',d:'From today: 8 applications + 3 referral asks a week. Log them on the Body tab.'},
  '2026-12-31':{id:'goal1',m:422,title:'Checkpoint: −3 kg',d:'Weigh in this morning. Year one done.'},
  '2027-02-27':{id:'goal2',m:605,title:'Checkpoint: offer in hand',d:'Target date for a signed offer.'},
  '2027-03-10':{id:'goal3',m:422,title:'Checkpoint: −15 kg, beach body',d:'Morning weigh-in + evening scan. Photos.'},
  '2027-03-27':{id:'bday',m:600,title:'Birthday 🎂',d:'Photos, celebrate, then set the next goal.'}
};
const BATCH=['Alsi for the week: dry-roast 7 tbsp for 2 min, cool, grind coarse → airtight jar in the fridge (keeps ~1 week)','Pressure-cook 1½ cups toor or moong dal → fridge (Mon lunch + extra)','Boil the soaked kala chana (5 whistles) with hing → fridge (chaat as a lunch side Mon–Tue)','Wash and chop lauki, beans, capsicum, tomato, cucumber into boxes; broccoli into florets; shell the matar','Wash palak + methi, dry on a cloth, store in a box lined with paper (keeps 4–5 days)','Make green chutney: coriander + green chilli + lemon + salt','Restock: besan, moong dal, roasted chana, makhana, paneer, milk, fruit'];
const SHOP=['Besan 1 kg (lasts ~2 weeks)','Yellow moong dal 1 kg','Whole green moong 500 g','Kabuli chana + kala chana + rajma 500 g each','Roasted chana 500 g, makhana 200 g','Milk 1 L/day (for curd)','Paneer 250–300 g/week','Winter veg: palak (3–4 bunches), methi, fresh matar 500 g, broccoli 2, mushroom 200 g, capsicum, tomato, lauki, beans, cucumber','Amla (1 a day in winter)','Fruit: bananas (7–9), apples or papaya','Whole-wheat pasta 500 g','Whey: 1 kg lasts ~1 month'];


/* ---------- build a day ---------- */
/* ---------- seeds: one new seed a week so the gut can adjust (they're fibre-heavy) ---------- */
const SEEDS={pumpkin:{n:'1 tbsp pumpkin seeds',p:3,how:'Raw or dry-roasted, on top or on the side. Zinc + magnesium: good for hair, skin and sleep.'},
  alsi:{n:'1 tbsp ground alsi (flax)',p:2,how:'Always ground: whole flax passes straight through. Stir into curd, chilla batter or poha after cooking.'},
  chia:{n:'1 tbsp chia, soaked',p:2,how:'Never dry. Soak in 200 ml water or chaas for 20 min (or overnight in the fridge) until it gels.'}};
const seedsFor=w=>{const x=Math.max(1,w);return {alsi:x>=2,chia:x>=3,pumpkin:true};};
function plan(d){
  const k=keyOf(d), w=Math.min(weekOf(d),WEEKS), ph=phaseOf(w), gymDay=!!GYM[k];
  const m=MENU[k], tm=MENU[keyOf(addDays(d,1))], train=[], meals=[], prep=[];
  const weigh=['mon','wed','fri','sun'].includes(k), dance=DANCE.includes(k), amGym=gymDay&&AM_GYM.includes(k);
  const workday=!['sat','sun'].includes(k), eveGym=gymDay&&workday;
  // Times per kind of day. Work is 10 am – 7 pm, Mon–Fri. Sunday is off.
  // 7–9 am: wake up, chores, walk/run, coffee. Gym Mon/Wed/Fri 7:30 pm + Sat noon, dance Tue/Thu 6–7 pm.
  // The gym is 30 min away each way.
  const T=k==='sat'?{wake:450,coffee:510,skin:540,b:555,st1:[600,690],go:690,gym:720,back:790,l:825,st2:[885,1065],s:1070,bonus:[1090,1270],d:1275,pn:1295,kc:1345,core:[1350,20],skinpm:1372,sleep:1395}
    :eveGym?{wake:420,am:440,coffee:500,skin:540,b:555,pm:565,s:1080,go:1140,gym:1170,back:1240,sh:1245,d:1275,pn:1295,st2:[1305,1365],kc:1366,core:[1369,10],skinpm:1381,sleep:1390}
    :dance?{wake:420,am:440,coffee:500,skin:540,b:555,pm:565,s:1005,eve:1080,d:1170,pn:1190,st2:[1215,1335],kc:1337,core:[1340,20],skinpm:1362,sleep:1380}
    :{wake:450,skin:465,b:495,bonus:[600,780],l:810,batch:885,s:960,st2:[990,1170],d:1200,pn:1220,kc:1345,skinpm:1360,sleep:1380};
  const sleepFor=Math.round(((1440-T.sleep)+(KEYS.includes(keyOf(addDays(d,1)))?wakeOf(addDays(d,1)):375))/15)/4;
  train.push({id:'wake',m:T.wake,kind:'routine',title:'Wake up'+(weigh?' + weigh in':''),d:'500 ml warm jeera-ajwain water (soaked overnight, de-bloats). '+(amGym?'Banana + coffee, then straight to the gym.':'Coffee now is fine; none after 2 pm.')+(weigh?' Weigh after the bathroom, before coffee. Log it on the Body tab.':'')});
  if(amGym) train.push({id:'gym',m:T.am,kind:'lift',title:'Gym · '+GYM[k].title,d:fmtT(T.am)+'–'+fmtT(T.am+70)+'. Dance tonight, so skip the cardio finisher if your legs feel heavy. Tap a box after each set.',gym:exFor(k,ph)});
  else if(T.am) train.push({id:'walk',m:T.am,kind:'cardio',title:'Walk / run · '+ph.walk,d:'After the morning chores. Brisk, talking pace (~115–135 bpm). Walk-jog (2 min walk / 1 min jog) only after a physio clears running.'});
  if(T.coffee) train.push({id:'coffee',m:T.coffee,kind:'routine',title:'Coffee run ☕',d:'Walk to the café and back. Black coffee or a small cappuccino, no sugar, no pastry. The steps count.'});
  const sf=studyFor(d), dur=(r)=>{const mn=r[1]-r[0];if(mn<60)return mn+' min';const h=Math.round(mn/15)/4;return String(h).replace('.5','½').replace('.75','¾').replace('.25','¼')+' h';};
  if(T.st1){const r=sf.light&&T.st1[1]-T.st1[0]>60?[T.st1[0],T.st1[0]+60]:T.st1; train.push({id:'st1',m:r[0],kind:'study',title:'Upskill · '+dur(r)+' · '+sf.am,d:fmtT(r[0])+'–'+fmtT(r[1])+'. Phone on silent. '+sf.amHow});}
  const hairDay=['mon','thu','sat'].includes(k);
  train.push({id:'skinam',m:T.skin,kind:'routine',title:'Shower + skin'+(hairDay?' + hair':'')+' · 5 min',d:'Gentle cleanser → niacinamide serum → moisturiser → SPF 50 (WFH days too).'+(hairDay?' Hair wash day: '+(k==='sat'?'mild shampoo':'ketoconazole 2% shampoo, leave 3 min')+', then a 4-min scalp massage.':'')});
  if(T.go) train.push({id:'togym',m:T.go,kind:'routine',title:'Leave for the gym · 30 min',d:'Bag, shaker with whey, water bottle. Use the ride: a tech podcast or a system-design video.'});
  if(T.back) train.push({id:'home',m:T.back,kind:'routine',title:'Head home · 30 min',d:'Shake on the way if you haven’t had it.'});
  if(workday) train.push({id:'work',m:600,kind:'routine',title:'Work · 10 am – 7 pm',d:'Stand and walk 2–3 min every hour. Screen at eye level. 2 L water. Chin tucks ×10, three times. No desk snacks except the planned one.'});
  if(k==='sun') train.push({id:'reset',m:T.wake+20,kind:'rest',title:'Reset + socialise',d:'No gym. Mornings and evenings are yours: see people, go out, rest. An easy walk anytime is a bonus.'});
  if(T.bonus){const r=T.bonus; train.push({id:'bonus',m:r[0],kind:'study',optional:true,title:'Bonus study · 3 h (only if no plans)',d:fmtT(r[0])+'–'+fmtT(r[1])+'. Got plans? Skip it, no guilt, it doesn’t count against the day. Free? Use it for the week’s weakest topic or the portfolio project.'});}
  const scan=SCANS.includes(iso(d));
  if(scan) train.push({id:'scan',m:k==='sat'?700:1155,kind:'routine',title:'Body scan at the gym',d:'Before training. No big meal in the 2 hours before.'});
  if(gymDay) train.push({id:'gym',m:T.gym,kind:'lift',title:'Gym · '+GYM[k].title,d:fmtT(T.gym)+'–'+fmtT(T.gym+70)+(workday?'. Log off at 7, leave straight away.':'. Evening free after this.')+' Tap a box after each set.',gym:exFor(k,ph)});
  if(dance) train.push({id:'eve',m:T.eve,kind:'cardio',title:'Dance class · 6–7 pm',d:'Hydrate. Go easy on jumps and deep twists (back first). Missed class? 45 min brisk walk instead.'});
  if(T.st2){
    // Weekdays have one evening block: first half DSA/main topic, second half the evening topic.
    if(T.st1&&sf.pm){const r=T.st2; train.push({id:'st2',m:r[0],kind:'study',title:'Upskill · '+dur(r)+' · '+sf.pm,d:fmtT(r[0])+'–'+fmtT(r[1])+'. '+sf.pmHow});}
    else if(!T.st1){
      const r=sf.light&&T.st2[1]-T.st2[0]>60?[T.st2[0],T.st2[0]+60]:T.st2, half=fmtT(r[0]+Math.round((r[1]-r[0])/2/5)*5);
      train.push(sf.pm&&!sf.light?{id:'st2',m:r[0],kind:'study',title:'Upskill · '+dur(r)+' · '+sf.am+' + '+sf.pm,d:fmtT(r[0])+'–'+half+': '+sf.am+'. '+sf.amHow+' Then until '+fmtT(r[1])+': '+sf.pm+'. '+sf.pmHow}
        :{id:'st2',m:r[0],kind:'study',title:'Upskill · '+dur(r)+' · '+sf.am,d:fmtT(r[0])+'–'+fmtT(r[1])+'. '+sf.amHow});
    }
  }
  if(k==='sun') train.push({id:'review',m:1172,kind:'routine',title:'Sunday review · 15 min',d:'Weekly weight average vs target, waist, wins, slips and what triggered them. Log career numbers on the Body tab. Pick 3 goals for next week.'});
  const once=ONCE[iso(d)]; if(once) train.push({...once,kind:'routine'});
  train.push({id:'kc',m:T.kc,kind:'routine',title:'No munching after dinner',d:'Tick only if nothing after dinner except water, saunf or herbal tea. Craving? Water, then brush your teeth.'});
  if(T.core) train.push({id:'core',m:T.core[0],kind:'routine',title:'Core + stretch · '+T.core[1]+' min',d:T.core[1]<20?'Short version: bird dog, side plank, glute bridge, 2 stretches.':'Bird dog, side plank, curl-up, glute bridge, then stretches. Details below.'});
  const retinoid=['mon','wed','fri'].includes(k)&&w>=3;
  train.push({id:'skinpm',m:T.skinpm,kind:'routine',title:'Skin PM · 3 min',d:'Cleanser → moisturiser.'+(retinoid?' Retinoid night: pea-size amount (the one your dermatologist suggests) on dry skin before moisturiser. Skip if irritated.':'')});
  train.push({id:'sleep',m:T.sleep,kind:'rest',title:'Lights out',d:'Phone charges outside the bedroom. Cool room, 22–24 °C. About '+sleepFor+' h until tomorrow’s alarm.'});

  const sd=seedsFor(w), add=(meal,seed)=>({...meal,d:meal.d+' + '+SEEDS[seed].n,p:meal.p+SEEDS[seed].p,how:(meal.how||'')+' '+SEEDS[seed].how});
  const _mp=meals.push.bind(meals);
  meals.push=(x)=>_mp(x.id==='b'&&sd.alsi?add(x,'alsi'):x.id==='s'?add(sd.chia?add(x,'chia'):x,'pumpkin'):x);
  meals.push(amGym?{id:'b',m:T.b,kind:'food',title:'Breakfast + post-gym shake',d:m.b.n+' + '+SHAKE.n,p:m.b.p+SHAKE.p,how:m.b.how+' Shake within 30 min of the gym.'}:{id:'b',m:T.b,kind:'food',title:'Breakfast',d:m.b.n,p:m.b.p,how:m.b.how});
  meals.push(k==='sat'?{id:'l',m:T.l,kind:'food',title:'Lunch + post-gym shake',d:m.l.n+' + '+SHAKE.n,p:m.l.p+SHAKE.p,how:m.l.how}:{id:'l',m:T.l||780,kind:'food',title:'Lunch',d:m.l.n+' · saunf + 10 min walk after',p:m.l.p,how:m.l.how});
  const pre=dance?'Pre-dance snack':eveGym?'Pre-gym snack':'Snack';
  meals.push({id:'s',m:T.s,kind:'food',title:pre,d:(dance||eveGym?'1 banana + ':'')+m.s.n,p:m.s.p,how:m.s.how});
  if(eveGym) meals.push({id:'sh',m:T.sh,kind:'food',title:'Post-gym shake',d:SHAKE.n,p:SHAKE.p,how:SHAKE.how});
  if(dance) meals.push({id:'sh',m:T.d+5,kind:'food',title:'Shake with dinner',d:SHAKE.n,p:SHAKE.p,how:'Dance days: have it with dinner.'});
  meals.push({id:'d',m:T.d,kind:'food',title:'Dinner',d:m.d.n+' · saunf + 10 min walk after',p:m.d.p,how:m.d.how});

  const morn=[m.b.morn,m.l.morn,m.d.morn].filter(Boolean);
  if(morn.length&&T.pm) prep.push({id:'pm',m:T.pm,kind:'prep',title:'Cook + pack lunch · 20 min',list:morn});
  if(k==='sun') prep.push({id:'batch',m:T.batch,kind:'prep',title:'Sunday batch prep · 60–75 min',list:BATCH});
  const night=[tm.b.night,tm.l.night,tm.d.night].filter(Boolean);
  if(k==='sat') night.push('Soak 1 cup kala chana (for tomorrow’s batch prep).');
  night.push('Set curd: warm 500 ml milk to lukewarm, stir in 1 tsp curd, cover. Ready by morning.');
  if(seedsFor(weekOf(addDays(d,1))).chia) night.push('Chia for tomorrow’s snack: 1 tbsp in 200 ml water, fridge.');
  prep.push({id:'pn',m:T.pn,kind:'prep',title:'Night prep for tomorrow · 10 min',list:night});

  const protein=meals.reduce((a,x)=>a+(x.p||0),0);
  return {k,w,ph,train,meals,prep,protein,all:[...train,...meals,...prep].sort((a,b)=>a.m-b.m)};
}
const wakeOf=d=>{const k=keyOf(d);return k==='sat'||k==='sun'?450:420;};

function setOVR(o){OVR=Object.assign({menu:{},study:{am:{},pm:{},how:{}},gym:{},log:[]},o||{});OVR.study=Object.assign({am:{},pm:{},how:{}},OVR.study);
  if(!OVR.study.v2){OVR.study.am={};OVR.study.pm={};OVR.study.v2=true;} // topics from the old 6-week plan give way to the phased curriculum
  applyOVR();}
const getOVR=()=>OVR;
export {SEEDS,seedsFor,GOALS,SCANS,CAREER,careerOf,studyFor,HOW,START,WARMUP_START,WEEKS,DAY,KEYS,NAME,SHORT,ist,keyOf,iso,addDays,weekOf,fmtT,fmtD,PHASES,phaseOf,WARM,GYM,exFor,STUDY,FOCUS,DANCE,MENU,clone,DEF,applyOVR,setOVR,getOVR,SHAKE,BATCH,SHOP,plan};
