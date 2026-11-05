/* The plan: schedule, workouts, meals, prep and study blocks. Your saved changes (overrides) are applied on top. */

/* ---------- calendar: plan runs Mon 16 Nov – Sun 27 Dec 2026 (6 weeks).
   The two weeks before (from Mon 2 Nov) are a warm-up: same schedule, light weights. ---------- */
const START=new Date(2026,10,16), WEEKS=6, DAY=864e5;
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
  {from:1,to:1,name:'Learn',walk:'30 min',note:'Learn the moves. Every set easy, 3 reps left in the tank. Write down your weights.'},
  {from:2,to:3,name:'Build',walk:'35–40 min',note:'Stop each set 1–2 reps short of failure. Add 1 rep or the smallest weight jump each session.'},
  {from:4,to:5,name:'Push',walk:'40–45 min',note:'First two lifts get a 4th set. Bike intervals go to 12 min. Keep form strict, stop when it slips.'},
  {from:6,to:6,name:'Deload + check-in',walk:'30 min',note:'Lighter week: 2 sets each at about 70% of your usual weights. Sat 26 Dec: weigh, measure waist, photos, evening body scan.'}
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
  tue:{title:'Upper body A',ex:[WARM,
    {name:'Machine chest press',sr:'3 × 8–12',sets:3,rest:'2 min',cue:'Feet flat, back on the pad, 2 s down.'},
    {name:'Lat pulldown',sr:'3 × 8–12',sets:3,rest:'90 s',cue:'Pull to upper chest, elbows down. Don’t lean far back.'},
    {name:'Seated cable row',sr:'3 × 10–12',sets:3,rest:'90 s',cue:'Sit tall, squeeze shoulder blades. No rocking.'},
    {name:'Seated dumbbell press',sr:'3 × 8–12',sets:3,rest:'90 s',cue:'Bench upright, back against it, ribs down.'},
    {name:'Face pull',sr:'3 × 12–15',sets:3,rest:'60 s',cue:'Rope to forehead, elbows high. Posture fixer.'},
    {name:'Rope pushdown',sr:'2 × 12–15',sets:2,rest:'60 s',cue:'Elbows pinned to your sides.'},
    {name:'Cable biceps curl',sr:'2 × 12–15',sets:2,rest:'60 s',cue:'No swinging.'},
    {kind:'cardio',name:'Bike, easy',sr:'15 min',sets:1,cue:'Talking pace.'}]},
  thu:{title:'Glutes + hamstrings',ex:[WARM,
    {name:'Hip thrust',sr:'3 × 10–12',sets:3,rest:'90 s',cue:'Chin tucked, ribs down, squeeze 1 s at top. Don’t arch.'},
    {name:'Seated leg curl',sr:'3 × 12',sets:3,rest:'60 s',cue:'Slow on the way back.'},
    {name:'Split squat holding a rail',sr:'3 × 10 / leg',sets:3,rest:'60 s',cue:'Short stance, torso upright, back knee down gently.'},
    {name:'Cable kickback',sr:'2 × 12 / side',sets:2,rest:'45 s',cue:'Kick back with the glute, not the lower back.'},
    {name:'Low step-ups',sr:'2 × 10 / leg',sets:2,rest:'60 s',cue:'Knee-height box or lower. Push through the heel.'},
    {name:'Pallof press',sr:'3 × 10 / side',sets:3,rest:'30 s',cue:'Cable at chest height. Resist the twist.'},
    {kind:'cardio',name:'Bike intervals',sr:'10 min',sets:1,cue:'30 s fast / 60 s easy, then easy. Back straight.'}]},
  fri:{title:'Upper body B',ex:[WARM,
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
    if(e.kind) {const x={...e}; if(ph.name==='Push'&&e.name==='Bike intervals'){x.sr='12 min'} return x;}
    let sets=e.sets;
    if(ph.name==='Push'&&(i===1||i===2)) sets=e.sets+1;
    if(ph.name.startsWith('Deload')) sets=Math.min(2,e.sets);
    const tail=e.sr.split('×')[1];
    return {...e,sets,sr:sets+' ×'+tail};
  });
}
const STUDY={
  am:{mon:'Coding practice (DSA)',tue:'Coding practice (DSA)',wed:'Coding practice (DSA)',thu:'Coding practice (DSA)',fri:'Coding practice (DSA)',sat:'Mock interview + revision',sun:'DSA weekly review'},
  pm:{mon:'System design',tue:'Backend deep-dive',wed:'Backend deep-dive',thu:'System design',fri:'Portfolio project',sat:'Resume + job applications',sun:'Portfolio project'},
  how:{'Coding practice (DSA)':'2–3 problems on this week’s pattern. Timebox 30 min each, then read the solution and redo it.',
    'Mock interview + revision':'One timed mock (peer or platform), then redo every question you missed.',
    'DSA weekly review':'Redo the 5 hardest problems of the week from scratch.',
    'System design':'One design per session: requirements → API → data model → scaling → trade-offs. Payments systems are your edge.',
    'Backend deep-dive':'Your stack in depth: databases and indexing, caching, queues, concurrency, API design.',
    'Portfolio project':'Build one project that shows the skills of your target role. Commit something every session.',
    'Resume + job applications':'Update resume with numbers from your mPoint work. Apply to 5–10 roles, message 3 people.'}
};
const FOCUS={mon:'Legs',tue:'Upper',wed:'Dance',thu:'Glutes',fri:'Upper',sat:'Active',sun:'Rest'};

/* ---------- meals (Jain, no oats, no soya) ---------- */
// night = prep the evening BEFORE; morn = cooking at 7:45 am same day
const MENU={
  mon:{
    b:{n:'2 besan chilla + bowl of curd',p:18,how:'80 g besan + water + ajwain + green chilli + salt + coriander. Cook 2 thin chillas with ½ tsp oil.'},
    l:{n:'2 roti + thick moong dal + lauki sabzi + curd + salad',p:20,how:'Dal from Sunday’s batch. Lauki: jeera, hing, turmeric, 10 min.',morn:'Make lauki sabzi + 2 roti, pack with Sunday dal and curd.'},
    s:{n:'Hung curd bowl + cucumber + chaat masala',p:8,how:'150 g hung curd, chopped cucumber, chaat masala, chilli flakes.'},
    d:{n:'Kala chana chaat + bowl of curd',p:16,how:'Sunday-boiled chana + tomato, cucumber, lemon, chaat masala, green chilli, coriander.'}},
  tue:{
    b:{n:'2 moong dal chilla + hung curd dip',p:16,how:'Grind soaked dal with green chilli, jeera, salt. 2 chillas. Dip: hung curd + mint + chaat masala.',night:'Soak ½ cup yellow moong dal (tomorrow’s breakfast chilla).'},
    l:{n:'1 cup rice + rajma + cucumber raita + salad',p:15,how:'Rajma in tomato gravy with Jain spices.',night:'Soak ¾ cup rajma (tomorrow’s lunch).',morn:'Pressure-cook the soaked rajma (6–7 whistles) while you eat; make rice and raita; pack.'},
    s:{n:'30 g roasted chana',p:6,how:'From the packet into a small bowl, not straight from the packet.'},
    d:{n:'Moong dal soup + 1 roti + 75 g paneer tikka',p:24,how:'¼ cup moong dal, 2 whistles, temper with jeera. Paneer cubes + curd + spices, pan-sear 5 min.'}},
  wed:{
    b:{n:'Jain poha with peanuts + bowl of curd',p:11,how:'Rinse poha. Temper mustard seeds, curry leaves, peanuts, turmeric, chilli. Lemon on top.'},
    l:{n:'2 roti + Jain chana masala + curd + salad',p:18,how:'Tomato-based masala, no onion or garlic.',night:'Soak ½ cup kabuli chana (tomorrow’s lunch).',morn:'Pressure-cook soaked chana (5–6 whistles), make masala and 2 roti, pack.'},
    s:{n:'Chaas with jeera + 1 fruit',p:6,how:'1 glass buttermilk, roasted jeera, black salt.'},
    d:{n:'Thick dal + 1 roti + sabzi + raita',p:17,how:'¼ cup toor or moong dal, any Jain sabzi (bhindi, beans, capsicum).'}},
  thu:{
    b:{n:'2 besan chilla + bowl of curd',p:18,how:'Same as Monday. Stuff with 30 g grated paneer for +5 g protein.'},
    l:{n:'2 moong dal chilla + hung curd dip + sabzi',p:18,how:'Grind soaked dal, make chillas, quick sabzi.',night:'Soak ½ cup yellow moong dal + hang 250 g curd in a muslin cloth (tomorrow’s lunch).',morn:'Grind dal, make 2 chillas + quick sabzi, pack with the hung curd dip.'},
    s:{n:'30 g roasted chana + chaas',p:8,how:'Small bowl of chana, 1 glass buttermilk with jeera.'},
    d:{n:'Thick mixed dal + 1 roti + bhindi sabzi + raita',p:17,how:'Mixed dal, 3 whistles.'}},
  fri:{
    b:{n:'Pesarattu + chutney + 10 almonds',p:16,how:'Grind soaked whole moong with green chilli, jeera, salt. Spread thin on tawa.',night:'Soak ½ cup whole green moong (tomorrow’s pesarattu).'},
    l:{n:'2 roti + mixed dal + 75 g paneer bhurji + salad',p:24,how:'Paneer bhurji with tomato and capsicum.',morn:'Cook mixed dal (3 whistles), make paneer bhurji, 2 roti, pack.'},
    s:{n:'Roasted makhana + chaas',p:6,how:'1 cup makhana dry-roasted with a pinch of salt and pepper.'},
    d:{n:'Whole-wheat veg pasta in hung-curd sauce',p:18,how:'60 g dry pasta + capsicum, tomato, beans. Sauce: hung curd + chilli flakes + oregano, off the heat.',night:'Hang 250 g curd (tomorrow’s pasta sauce).'}},
  sat:{
    b:{n:'Moong dal chilla + curd + 1 scoop whey shake',p:42,how:'Weekend: the shake goes with breakfast.',night:'Soak ½ cup yellow moong dal (tomorrow’s breakfast).'},
    l:{n:'Moong dal khichdi + curd + salad',p:16,how:'½ cup rice + ¼ cup moong dal, 3 whistles, ghee tadka (1 tsp).'},
    s:{n:'Fruit + bowl of curd',p:7,how:'Any seasonal fruit.'},
    d:{n:'Besan chilla + sabzi + raita',p:18,how:'Same as Monday’s chilla.'}},
  sun:{
    b:{n:'Jain poha with peanuts + curd + 1 scoop whey shake',p:37,how:'Weekend: the shake goes with breakfast.'},
    l:{n:'Dal-rice + raita + salad',p:15,how:'Use part of today’s batch dal.'},
    s:{n:'30 g roasted chana',p:6,how:'Small bowl.'},
    d:{n:'Paneer tikka (100 g) + sautéed veg + 1 roti',p:22,how:'Marinate in curd + spices, pan-sear.'}}
};
/* ---------- editable plan: defaults + your saved changes ---------- */
const clone=o=>JSON.parse(JSON.stringify(o));
const DEF={menu:clone(MENU),study:clone(STUDY),gym:Object.fromEntries(Object.entries(GYM).map(([k,g])=>[k,g.ex.filter(e=>e!==WARM).map(e=>({name:e.name,kind:e.kind||'',sets:e.sets,reps:e.kind?e.sr:e.sr.split('×')[1].trim(),rest:e.rest||'',cue:e.cue}))]))};
let OVR={menu:{},study:{am:{},pm:{},how:{}},gym:{},log:[]};
function applyOVR(){
  KEYS.forEach(k=>{['b','l','s','d'].forEach(m=>{MENU[k][m]=Object.assign(clone(DEF.menu[k][m]),(OVR.menu[k]||{})[m]||{})})});
  ['am','pm'].forEach(t=>KEYS.forEach(k=>{STUDY[t][k]=(OVR.study[t]||{})[k]||DEF.study[t][k]}));
  STUDY.how=Object.assign(clone(DEF.study.how),OVR.study.how||{});
  Object.keys(GYM).forEach(k=>{const list=OVR.gym[k]||DEF.gym[k];GYM[k].ex=[WARM,...list.map(e=>({name:e.name,kind:e.kind||undefined,sets:e.kind?1:Math.max(1,+e.sets||1),sr:e.kind?e.reps:(Math.max(1,+e.sets||1)+' × '+e.reps),rest:e.rest,cue:e.cue}))]});
}
const SHAKE={n:'1 scoop whey in water',p:26,how:'Within 30 min after the gym.'};
const BATCH=['Pressure-cook 1½ cups toor or moong dal → fridge (Mon lunch + extra)','Boil the soaked kala chana (5 whistles) → fridge (Mon dinner chaat)','Wash and chop lauki, beans, capsicum, tomato, cucumber into boxes','Make green chutney: coriander + green chilli + lemon + salt','Restock: besan, moong dal, roasted chana, makhana, paneer, milk, fruit'];
const SHOP=['Besan 1 kg (lasts ~2 weeks)','Yellow moong dal 1 kg','Whole green moong 500 g','Kabuli chana + kala chana + rajma 500 g each','Roasted chana 500 g, makhana 200 g','Milk 1 L/day (for curd)','Paneer 250–300 g/week','Seasonal veg: lauki, beans, capsicum, bhindi, tomato, cucumber','Fruit: bananas (7–9), apples or papaya','Whole-wheat pasta 500 g','Whey: 1 kg lasts ~1 month'];


/* ---------- build a day ---------- */
function plan(d){
  const k=keyOf(d), w=Math.min(weekOf(d),WEEKS), ph=phaseOf(w), gymDay=!!GYM[k];
  const m=MENU[k], tm=MENU[keyOf(addDays(d,1))], train=[], meals=[], prep=[];
  const weigh=['mon','wed','fri','sun'].includes(k);
  train.push({id:'wake',m:375,kind:'routine',title:'Wake up'+(weigh?' + weigh in':''),d:'500 ml water. Coffee now is fine; none after 2 pm.'+(weigh?' Weigh after the bathroom, before coffee. Note it down.':'')});
  if(k==='wed'||k==='sun') train.push({id:'walk',m:390,kind:'cardio',title:'Long walk · 45 min',d:'Talking pace, ~115–135 bpm.'+(k==='sun'?' Then 15 min mobility.':'')});
  else train.push({id:'walk',m:390,kind:'cardio',title:'Morning walk · '+ph.walk,d:'Brisk, talking pace. Walk-jog (2 min walk / 1 min jog) only after a physio clears running.'});
  const amT=STUDY.am[k], pmT=STUDY.pm[k], wkEnd=(k==='sat'||k==='sun');
  train.push({id:'st1',m:490,kind:'study',title:'Upskill · 2 h · '+amT,d:'8:10–10:10 am. Phone on silent. '+STUDY.how[amT]});
  if(k!=='sat'&&k!=='sun') train.push({id:'work',m:615,kind:'routine',title:'Workday habits',d:'Stand and walk 2–3 min every hour. Screen at eye level. 2 L water. Chin tucks ×10, three times.'});
  const scan=['2026-11-16','2026-12-05','2026-12-26'].includes(iso(d));
  if(scan) train.push({id:'scan',m:1095,kind:'routine',title:'Body scan at the gym',d:'Before training, same evening time as your past scans. No big meal in the 2 hours before.'});
  if(gymDay) train.push({id:'gym',m:1110,kind:'lift',title:'Gym · '+GYM[k].title,d:'6:30–7:40 pm. Tap a box after each set.',gym:exFor(k,ph)});
  else if(k==='wed') train.push({id:'eve',m:1110,kind:'cardio',title:'Dance class',d:'No class? 20 min easy bike + core circuit at the gym.'});
  else if(k==='sat') train.push({id:'eve',m:1110,kind:'cardio',title:'Dance or 60 min walk',d:'Weekend cardio.'});
  train.push(wkEnd?{id:'st2',m:900,kind:'study',title:'Upskill · 2 h · '+pmT,d:'3:00–5:00 pm. '+STUDY.how[pmT]}:{id:'st2',m:1230,kind:'study',title:'Upskill · 2 h · '+pmT,d:'8:30–10:30 pm. '+STUDY.how[pmT]});
  train.push({id:'core',m:1350,kind:'routine',title:'Core + stretch · 20 min',d:'Bird dog, side plank, curl-up, glute bridge, then stretches. Details below.'});
  train.push({id:'sleep',m:1380,kind:'rest',title:'Lights out',d:'Cool room, 22–24 °C. Phone away. 7¼ h until 6:15.'});

  meals.push({id:'b',m:450,kind:'food',title:'Breakfast',d:m.b.n,p:m.b.p,how:m.b.how});
  meals.push({id:'l',m:780,kind:'food',title:'Lunch',d:m.l.n+' · then 10 min walk',p:m.l.p,how:m.l.how});
  meals.push({id:'s',m:1020,kind:'food',title:gymDay?'Pre-gym snack':'Snack',d:(gymDay?'1 banana + ':'')+m.s.n,p:m.s.p,how:m.s.how});
  if(gymDay) meals.push({id:'sh',m:1185,kind:'food',title:'Post-gym shake',d:SHAKE.n,p:SHAKE.p,how:SHAKE.how});
  meals.push({id:'d',m:1200,kind:'food',title:'Dinner',d:m.d.n+' · then 10 min walk',p:m.d.p,how:m.d.how});
  if(k==='wed') meals.push({id:'sh',m:1205,kind:'food',title:'Shake with dinner',d:SHAKE.n,p:SHAKE.p,how:'Dance days: have it with dinner.'});

  const morn=[m.b.morn,m.l.morn,m.d.morn].filter(Boolean);
  if(morn.length) prep.push({id:'pm',m:465,kind:'prep',title:'Cook + pack lunch · 20 min',list:morn});
  if(k==='sun') prep.push({id:'batch',m:1020,kind:'prep',title:'Sunday batch prep · 60–75 min',list:BATCH});
  const night=[tm.b.night,tm.l.night,tm.d.night].filter(Boolean);
  if(k==='sat') night.push('Soak 1 cup kala chana (for tomorrow’s batch prep).');
  night.push('Set curd: warm 500 ml milk to lukewarm, stir in 1 tsp curd, cover. Ready by morning.');
  prep.push({id:'pn',m:1220,kind:'prep',title:'Night prep for tomorrow · 10 min',list:night});

  const protein=meals.reduce((a,x)=>a+(x.p||0),0);
  return {k,w,ph,train,meals,prep,protein,all:[...train,...meals,...prep].sort((a,b)=>a.m-b.m)};
}


function setOVR(o){OVR=Object.assign({menu:{},study:{am:{},pm:{},how:{}},gym:{},log:[]},o||{});OVR.study=Object.assign({am:{},pm:{},how:{}},OVR.study);applyOVR();}
const getOVR=()=>OVR;
export {START,WARMUP_START,WEEKS,DAY,KEYS,NAME,SHORT,ist,keyOf,iso,addDays,weekOf,fmtT,fmtD,PHASES,phaseOf,WARM,GYM,exFor,STUDY,FOCUS,MENU,clone,DEF,applyOVR,setOVR,getOVR,SHAKE,BATCH,SHOP,plan};
